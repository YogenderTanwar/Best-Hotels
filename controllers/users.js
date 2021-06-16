const User = require('../models/user');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
       // console.log(req.file);
        if(req.file) user.profileImage.url = req.file.path;
        if (req.file) user.profileImage.filename = req.file.filename;
        await user.save();
       
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Best Hotels!');
            res.redirect('/hotels');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
}

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'welcome back!');
    // console.log(req.user._id);
    const redirectUrl = req.session.returnTo || '/hotels';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    req.logout();
    req.flash('success', "Goodbye!");
    res.redirect('/hotels');
}