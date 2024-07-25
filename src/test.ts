import assert from "assert";

try {
    console.assert("blah" as string == "b", "error");
} catch(e) {
    console.log("caught exception");
}