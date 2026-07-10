const mongoose = require("mongoose");

const connect = () => {
    mongoose.connect('mongodb://127.0.0.1:27017/DEMS')
        .then(() => {
            console.log('database connnected succcessfully to dems application');
        })
        .catch((error) => {
            console.log(error);
        })
}

module.exports = { connect };