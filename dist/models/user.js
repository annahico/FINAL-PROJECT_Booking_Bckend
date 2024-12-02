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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
// Definición del esquema de usuario
const userSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
});
// Middleware para encriptar la contraseña antes de guardar el usuario
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Verificar si la contraseña ha sido modificada
        if (this.isModified("password")) {
            try {
                // Encriptar la contraseña con bcrypt
                this.password = yield bcryptjs_1.default.hash(this.password, 8);
            }
            catch (error) {
                // Verificar el tipo de error y pasar a la función next()
                if (error instanceof Error) {
                    next(error); // Tipo Error compatible con CallbackError
                }
                else {
                    next(new Error("Error desconocido durante la encriptación")); // Crear un nuevo Error genérico
                }
                return; // Detener la ejecución de la función pre-save
            }
        }
        // Continuar con el proceso de guardado
        next();
    });
});
// Creación del modelo de usuario
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
