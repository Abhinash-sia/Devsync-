import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const userSchema = new Schema(
  {  name:{
        type:String,
        requried : [true, "Name is required"],
        trim:true,
        unique:true
    },
    email:{
        type:String,
        requried:[true, "Email is reqired"],
        unique: true,
        lowercase:true,
        trim:true,
    },
    password:{
        type: String,
        requried:[true,"Password is required"],
        minlenght:[8 , "Password must be atlease 8 characters"]
    },
    refreshToken:{
        type:String,
    },


},
{timestamps:true}

    
);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});


userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name:this.name,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },  
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } 
  );
};

const User = mongoose.model("User", userSchema);
export default User;