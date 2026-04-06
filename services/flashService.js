function setFlash(req, key, value) {
  if (!req.session) {
    return;
  }

  req.session.flash = req.session.flash || {};
  req.session.flash[key] = value;
}

function consumeFlash(req, key) {
  if (!req.session || !req.session.flash) {
    return null;
  }

  const value = Object.prototype.hasOwnProperty.call(req.session.flash, key)
    ? req.session.flash[key]
    : null;

  delete req.session.flash[key];

  if (Object.keys(req.session.flash).length === 0) {
    delete req.session.flash;
  }

  return value;
}

module.exports = {
  consumeFlash,
  setFlash,
};
