const glob = require("glob");
const files = glob.sync("./**/*.function.js", {
  cwd: __dirname,
  ignore: "./node_modules/**",
});
for (let f = 0, fl = files.length; f < fl; f++) {
  const file = files[f];
  const functionName = file.split("/").pop().slice(0, -12); // Strip off '.function.js'
  console.log(functionName);
  if (
    !process.env.FUNCTION_TARGET ||
    process.env.FUNCTION_TARGET === functionName
  ) {
    exports[functionName] = require(file);
  }
}

// exports the api to firebase cloud function
