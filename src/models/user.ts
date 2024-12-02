import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { UserType } from "../shared/types";

// Definición del esquema de usuario
const userSchema = new mongoose.Schema<UserType>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
});

// Middleware para encriptar la contraseña antes de guardar el usuario
userSchema.pre("save", async function (next) {
  // Verificar si la contraseña ha sido modificada
  if (this.isModified("password")) {
    try {
      // Encriptar la contraseña con bcrypt
      this.password = await bcrypt.hash(this.password, 8);
    } catch (error) {
      // Verificar el tipo de error y pasar a la función next()
      if (error instanceof Error) {
        next(error); // Tipo Error compatible con CallbackError
      } else {
        next(new Error("Error desconocido durante la encriptación")); // Crear un nuevo Error genérico
      }
      return; // Detener la ejecución de la función pre-save
    }
  }
  // Continuar con el proceso de guardado
  next();
});

// Creación del modelo de usuario
const User = mongoose.model<UserType>("User", userSchema);

export default User;
