export const formatPhoneWA = (numberPhone: string, prefix = 62) => {
  var type: string;
  if (numberPhone.endsWith("@g.us")) {
    type = "@g.us";
  } else {
    type = "@s.whatsapp.net";
    // type = "@c.us";
  }

  // 1. menghilangkan karakter selain angka
  let number: string = numberPhone.replace(/\D/g, "");
  // 2. ganti angka 0 didepan menjadi prefix
  if (number.startsWith("0")) {
    number = prefix + number.substr(1);
  }
  return (number += type);
};
