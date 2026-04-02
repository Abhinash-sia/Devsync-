import express from "express"
import cors from 'cors'
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

import cookieParser from "cookie-parser"


const app = express();

//  Security & Parsing Middleware 
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173", 
  credentials: true 
}));

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public")); 
app.use(cookieParser());  

//  Routes 

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);

//Global Error Handler
app.use ((err , req ,res , next)=>{
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error"

    return res.status(statusCode).json({
        success:false,
        statusCode,
        message,
        errors:err.errors || []

    });
});



export {app}