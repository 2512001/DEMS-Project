const uploadEvidence =  async (req , res  , next) =>{
    try{
    
        console.log(req.file);
        const filesize = req.file.size / 1024 / 1024;

        res.status(201).json({
            status : true,
            message : `file has been uploaded ${req.file.originalname}`,
            fliesize :  `file size in mb ${filesize}`
        })
    }catch(err){
        next(error);
    }
}


module.exports = {
    uploadEvidence,
}