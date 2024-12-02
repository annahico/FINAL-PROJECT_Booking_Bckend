import express, { Request, Response } from "express";
import verifyToken from "../middleware/auth";
import Hotel from "../models/hotel";
import { HotelType } from "../shared/types";

const router = express.Router();

// Ruta para obtener las reservas del usuario
router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    // Buscar hoteles que contengan reservas del usuario autenticado
    const hotels = await Hotel.find({
      bookings: { $elemMatch: { userId: req.userId } },
    });

    // Filtrar y estructurar las reservas del usuario
    const results = hotels.map((hotel) => {
      // Filtrar las reservas que pertenecen al usuario autenticado
      const userBookings = hotel.bookings.filter(
        (booking) => booking.userId === req.userId
      );

      // Crear un nuevo objeto de hotel con solo las reservas del usuario
      const hotelWithUserBookings: HotelType = {
        ...hotel.toObject(),
        bookings: userBookings,
      };

      return hotelWithUserBookings;
    });

    // Enviar la respuesta con las reservas filtradas
    res.status(200).send(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Unable to fetch bookings" });
  }
});

export default router;
