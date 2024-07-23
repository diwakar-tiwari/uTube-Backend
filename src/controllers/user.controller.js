import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req,res) =>{
    //1. Get Data from the frontend(user)
    //2. Validate the data (empty or not)
    //3. Check if already exist in the database (email, username)
    //4. check for image and avatar
    //5. upload them on cloudinary
    //6. create user object (entry in db)
    //7. remove password and refresh token from the response
    //8. check for user creation
    //9. return res

      //1. Get Data from the frontend(user)
    const {fullName, email, userName, password} =  req.body
    console.log("email:",email);

    //2. Validate the data (empty or not)

    if(
        [fullName, email, userName, password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    //3. Check if already exist in the database (email, username)
    const existedUser =  User.findOne({
        $or: [{ userName },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "Email or username already exist")
    }

    //4. check for image and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    //5. upload them on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        usernName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

export {
    registerUser,
}