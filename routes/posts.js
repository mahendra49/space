//all required
const   express          = require("express"),
        router           = express.Router(),
        Post             = require("../models/posts"),
        User             = require("../models/users"),
        Middleware       = require("../middleware/index"),
        expressSanitizer = require("express-sanitizer"),
        multer           = require("multer"),
        path             = require("path"),
        randomstring = require("randomstring");

//storage path and rename file name for profile pictures
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './images/')
  },
  filename: function (req, file, cb) {
    cb(null, req.user.username+".jpg");
  }
});

var uploadProfile = multer({ //multer settings
    storage: storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('Only images are allowed'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
});

//storage path and rename file name for posts pictures
var posts_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './postsImages/')
  },
  filename: function (req, file, cb) {
    let date = (Date()+randomstring.generate()).replace(/ /g,"");
    cb(null, req.user.username+date+".jpg");
  }
});

var uploadPosts = multer({ //multer settings
    storage: posts_storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('Only images are allowed'))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
});


//new posts logic
router.get("/new",Middleware.isLoggedIn,function(req,res){
    res.render("new");
});

router.get("/:id",Middleware.isLoggedIn,function(req,res){
    Post.findById(req.params.id,function(err,post){
        if(err){
            console.log("error in getting posts");
            res.send("something went wrong");
        }
        else{
            res.render("show",{post:post});
        }
    });
});

//new posts by a user
router.post("/",Middleware.isLoggedIn,uploadPosts.array("p_images",3),function(req,res){
    
    //req.body.post.body  = req.sanitize(req.body.post.body);
    
    let newPost    = req.body.post;
    newPost.author = {
        id          : req.user._id,
        username    : req.user.username
    }; 
    newPost.body   = req.sanitize(newPost.body);
    newPost.title  = req.sanitize(newPost.title);
    newPost.image  = req.sanitize(newPost.image);
    newPost.uploadImgaesPath=new Array();

    //post image data info
    req.files.forEach((file)=>{
        newPost.uploadImgaesPath.push(file.filename);
    });
    console.log(newPost.uploadImgaesPath);

    Post.create(newPost,function(err,post){
        if(err){
            console.log("error--posts route");
            res.redirect("/posts/new");
        }
        else{
            User.findOne({username:req.user.username},function(err,founduser){
                if(err){
                    console.log("error in finding user");
                    res.redirect("/login");
                }else{
                    founduser.posts.push(post);
                    founduser.save(function(err,data){
                        if(err){
                            console.log("error in saving post, try again");
                            res.redirect("/");
                        }
                        else{
                            res.redirect("/user");
                        }
                    });
                }
             });
        }
    });
});

 // db.posts.find({"created":{"$lte":new Date("Thu Sep 20 2018 19:52:14 GMT+0530")}});

router.post("/loadpost",Middleware.isLoggedIn,(req,res)=>{
    const timestamp=req.body.timestamp;
    Post.find({"created":{"$lte":new Date(timestamp)}})
        .sort('-created').limit(5)
        .populate("comments").exec((err,data)=>{
            if(err){
                console.log("error in ajax load comments");
                res.json({"error":"loading ajax"});
            }else{  
                res.json(data);    
            }
            
    });    
});

router.get("/profilepicture/:id",(req,res)=>{
    console.log("here");
    res.sendFile(path.join(__dirname, '..', '/images',req.params.id+'.jpg'));
});

//upload picture and save it with user mongo id(unique)
router.post("/profilepicture",Middleware.isLoggedIn,uploadProfile.single("profilepicture"),(req,res)=>{
    console.log("here1");
    //find user and upload picture
    User.findOne({username:req.user.username},(err,userdata)=>{
        if(err){
            console.log("error");
        }else{
            userdata.profilepicture="./images/"+req.user.username;
            userdata.save((err,data)=>{
                if(err){
                    console.log("error in saving data");
                    res.json({"ok":"0"});
                }
                else{
                    res.json({"ok":"1"});
                }
            });
        }    

    });
});

module.exports = router; 