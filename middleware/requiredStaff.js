'use strict';

exports.requireStaff = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login?error=1');
  if (req.session.user.role !== 'staff') return res.status(403).send('Forbidden');
  next();
};