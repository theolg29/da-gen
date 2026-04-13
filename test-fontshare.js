const fontName = "Satoshi";
const fontshareUrl = `https://api.fontshare.com/v2/css?f[]=${fontName.toLowerCase().replace(/ /g, "-")}@400,500,600,700&display=swap`;
console.log(fontshareUrl);
