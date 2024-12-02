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
const auth_1 = __importDefault(require("../middleware/auth"));
const hotel_1 = __importDefault(require("../models/hotel"));
const router = express_1.default.Router();
// Ruta para obtener las reservas del usuario
router.get("/", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Buscar hoteles que contengan reservas del usuario autenticado
        const hotels = yield hotel_1.default.find({
            bookings: { $elemMatch: { userId: req.userId } },
        });
        // Filtrar y estructurar las reservas del usuario
        const results = hotels.map((hotel) => {
            // Filtrar las reservas que pertenecen al usuario autenticado
            const userBookings = hotel.bookings.filter((booking) => booking.userId === req.userId);
            // Crear un nuevo objeto de hotel con solo las reservas del usuario
            const hotelWithUserBookings = Object.assign(Object.assign({}, hotel.toObject()), { bookings: userBookings });
            return hotelWithUserBookings;
        });
        // Enviar la respuesta con las reservas filtradas
        res.status(200).send(results);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Unable to fetch bookings" });
    }
}));
exports.default = router;
