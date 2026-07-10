const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://nishuanshad_db_user:bE9iFCKE84sH4iPE@cluster0.ec5kcbm.mongodb.net/elmentore?retryWrites=true&w=majority&appName=Cluster0')
.then(() => {
    console.log('SUCCESS');
    process.exit(0);
})
.catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
});
