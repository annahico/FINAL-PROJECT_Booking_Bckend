"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const stripe_1 = __importDefault(require("stripe"));
const auth_1 = __importDefault(require("../middleware/auth"));
const hotel_1 = __importDefault(require("../models/hotel"));
// Inicialización de Stripe
const stripe = new stripe_1.default(process.env.STRIPE_API_KEY);
const router = express_1.default.Router();
// Ruta para buscar hoteles
router.get("/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Construir la consulta de búsqueda a partir de los parámetros de la consulta
        const query = constructSearchQuery(req.query);
        // Configurar opciones de ordenamiento
        let sortOptions = {};
        switch (req.query.sortOption) {
            case "starRating":
                sortOptions = { starRating: -1 };
                break;
            case "pricePerNightAsc":
                sortOptions = { pricePerNight: 1 };
                break;
            case "pricePerNightDesc":
                sortOptions = { pricePerNight: -1 };
                break;
        }
        // Paginación
        const pageSize = 5;
        const pageNumber = parseInt(req.query.page ? req.query.page.toString() : "1");
        const skip = (pageNumber - 1) * pageSize;
        // Obtener hoteles con la consulta, ordenamiento y paginación aplicados
        const hotels = yield hotel_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(pageSize);
        const total = yield hotel_1.default.countDocuments(query);
        // Preparar respuesta de búsqueda de hoteles
        const response = {
            data: hotels,
            pagination: {
                total,
                page: pageNumber,
                pages: Math.ceil(total / pageSize),
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
}));
// Ruta para obtener todos los hoteles, ordenados por última actualización
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hotels = yield hotel_1.default.find().sort("-lastUpdated");
        res.json(hotels);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error fetching hotels" });
    }
}));
// Ruta para obtener un hotel específico por ID
router.get("/:id", [(0, express_validator_1.param)("id").notEmpty().withMessage("Hotel ID is required")], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const id = req.params.id.toString();
    try {
        const hotel = yield hotel_1.default.findById(id);
        res.json(hotel);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error fetching hotel" });
    }
}));
// Ruta para crear un intento de pago para una reserva
router.post("/:hotelId/bookings/payment-intent", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { numberOfNights } = req.body;
    const hotelId = req.params.hotelId;
    try {
        const hotel = yield hotel_1.default.findById(hotelId);
        if (!hotel) {
            return res.status(400).json({ message: "Hotel not found" });
        }
        const totalCost = hotel.pricePerNight * numberOfNights;
        // Crear un intento de pago con Stripe
        const paymentIntent = yield stripe.paymentIntents.create({
            amount: totalCost * 100,
            currency: "gbp",
            metadata: {
                hotelId,
                userId: req.userId,
            },
        });
        if (!paymentIntent.client_secret) {
            return res.status(500).json({ message: "Error creating payment intent" });
        }
        const response = {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret.toString(),
            totalCost,
        };
        res.send(response);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
}));
// Ruta para crear una reserva de hotel
router.post("/:hotelId/bookings", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentIntentId = req.body.paymentIntentId;
        const hotelId = req.params.hotelId;
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent) {
            return res.status(400).json({ message: "Payment intent not found" });
        }
        if (paymentIntent.metadata.hotelId !== hotelId || paymentIntent.metadata.userId !== req.userId) {
            return res.status(400).json({ message: "Payment intent mismatch" });
        }
        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: `Payment intent not succeeded. Status: ${paymentIntent.status}` });
        }
        const newBooking = Object.assign(Object.assign({}, req.body), { userId: req.userId });
        const hotel = yield hotel_1.default.findOneAndUpdate({ _id: hotelId }, { $push: { bookings: newBooking } }, { new: true } // Devuelve el documento actualizado
        );
        if (!hotel) {
            return res.status(400).json({ message: "Hotel not found" });
        }
        res.status(200).send();
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
}));
// Función para construir la consulta de búsqueda de hoteles
const constructSearchQuery = (queryParams) => {
    let constructedQuery = {};
    if (queryParams.destination) {
        constructedQuery.$or = [
            { city: new RegExp(queryParams.destination, "i") },
            { country: new RegExp(queryParams.destination, "i") },
        ];
    }
    if (queryParams.adultCount) {
        constructedQuery.adultCount = { $gte: parseInt(queryParams.adultCount) };
    }
    if (queryParams.childCount) {
        constructedQuery.childCount = { $gte: parseInt(queryParams.childCount) };
    }
    if (queryParams.facilities) {
        constructedQuery.facilities = {
            $all: Array.isArray(queryParams.facilities) ? queryParams.facilities : [queryParams.facilities],
        };
    }
    if (queryParams.types) {
        constructedQuery.type = {
            $in: Array.isArray(queryParams.types) ? queryParams.types : [queryParams.types],
        };
    }
    if (queryParams.stars) {
        const starRatings = Array.isArray(queryParams.stars)
            ? queryParams.stars.map((star) => parseInt(star))
            : [parseInt(queryParams.stars)];
        constructedQuery.starRating = { $in: starRatings };
    }
    if (queryParams.maxPrice) {
        constructedQuery.pricePerNight = { $lte: parseInt(queryParams.maxPrice) };
    }
    return constructedQuery;
};
exports.default = router;
