import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const generateAccessAndRefereshTokens = async (userId) =>{
    const user = await User.findById(userId)

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()


    //save referesh token in database without checking password
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return {accessToken, refreshToken}


}

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
    const existedUser = await User.findOne({
        $or: [{ userName },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "Email or username already exist")
    }

    //4. check for image and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    //5. upload them on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }
    //create user or save the details in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        userName: userName.toLowerCase()
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

const loginUser = asyncHandler(async (req,res) =>{
    //Get data from frontend
    const {username, email, password} = req.body;
    
    //check data
    if(!(username || email)){
        throw new ApiError(401, "Username or email required")
    }
    
    //find user in database
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    
    

    if(!user){
        throw new ApiError(404, "User not found")
    }    

    //check password is correct or not
    const isPassValid = user.isPasswordCorrect(password);
    // isPasswordCorrect
    if(!isPassValid){
        throw new ApiError (401, "User credential not valid")
    }

    //Generate Access and referesh token

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    //Send cookies
    //As refresh and access tokens are generated that's why, extract the details again from db
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

//Logout user
const logOut = asyncHandler(async(req,res) =>{
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})

export {
    registerUser,
    loginUser,
    logOut
}