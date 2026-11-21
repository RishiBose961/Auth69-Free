import crypto from "crypto";

export const generateNumericOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const generateMatchNumber = () => {
  return crypto.randomInt(10, 100);
};

export const generateNumberOptions = (correctNumber) => {
  const set = new Set([correctNumber]);
  while (set.size < 3) {
    set.add(crypto.randomInt(10, 100));
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
};

export const generateAlphabet4 = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
};

export const generateAlphabetOptions = (correctAlphabet) => {
  const set = new Set([correctAlphabet]);
  while (set.size < 3) {
    set.add(generateAlphabet4());
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
};
