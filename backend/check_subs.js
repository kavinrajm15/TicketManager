const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/TicketManager')
  .then(async () => {
    const users = await User.find({ "webPushSubscriptions.0": { $exists: true } });
    console.log(JSON.stringify(users.map(u => ({ email: u.email, subs: u.webPushSubscriptions.length })), null, 2));
    process.exit();
  });
