import { pbkdf2, randomBytes } from "crypto";

export const generateSalt = () => randomBytes(16).toString("hex");

export const hashPassword = (password, salt) =>
  new Promise((resolve, reject) => {
    pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });

export const verifyPassword = async (password, salt, storedHash) => {
  const hashed = await hashPassword(password, salt);
  return hashed === storedHash;
};
