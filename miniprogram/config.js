// The one place the mini program keeps its own runtime configuration.
//
// Nothing secret belongs here: the GitHub token and the publish password live in
// CloudBase *environment variables* on the cloud functions, never in the client
// bundle. See MINIPROGRAM.md.
module.exports = {
  // CloudBase environment id, e.g. "deuceline-9gxxxxxxxxxxx". Leave it empty to
  // use the default environment of the account that uploaded this mini program.
  cloudEnv: "",
};
