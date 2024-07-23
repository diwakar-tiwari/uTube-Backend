import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"})) //getting data from form
app.use(express.urlencoded({extended:true, limit:"16kb"})) // getting data from url
app.use(express.static("public"))

//Import routes
import userRoute from './routes/user.route.js'


//Route Declaration
app.use("/api/v1/users", userRoute)

app.use(cookieParser())
export {app}