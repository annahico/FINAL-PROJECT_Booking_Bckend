import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import verifyToken from "../middleware/auth";
import User from "../models/user";

const router = express.Router();

// Ruta para obtener los detalles del usuario autenticado
router.get("/me", verifyToken, async (req: Request, res: Response) => {
  const userId = req.userId;

  try {
    // Buscar el usuario por ID y excluir el campo de contraseña
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Ruta para registrar un nuevo usuario
router.post(
  "/register",
  [
    check("firstName", "First Name is required").isString(),
    check("lastName", "Last Name is required").isString(),
    check("email", "Email is required").isEmail(),
    check("password", "Password with 6 or more characters required").isLength({
      min: 6,
    }),
  ],
  async (req: Request, res: Response) => {
    // Validar los datos del registro
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }

    try {
      // Verificar si el usuario ya existe
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Crear un nuevo usuario y guardarlo en la base de datos
      user = new User(req.body); //fallo seguridad, arreglarlo para el superadmin
      await user.save();

      // Generar un token JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET_KEY as string, //siempre hay que poner la clave en .env para que funcione OR || poner string secreto
        { expiresIn: "1d" }
      );

      // Configurar la cookie con el token JWT
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400000, // 1 día en milisegundos
      });

      res.status(200).send({ message: "User registered OK" });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  }
);

export default router;
