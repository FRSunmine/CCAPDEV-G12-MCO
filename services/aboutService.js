const packageJson = require("../package.json");

function getAboutPageData() {
  const packages = Object.entries(packageJson.dependencies || {})
    .map(([name, version]) => ({ name, version }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const libraries = [
    {
      name: "Leaflet",
      purpose: "Interactive restaurant map inset on the search page.",
    },
    {
      name: "OpenStreetMap",
      purpose: "Map tiles and attribution used by the Leaflet view.",
    },
    {
      name: "Google Fonts (Fredoka)",
      purpose: "Web typography used across the application.",
    },
  ];

  return { packages, libraries };
}

module.exports = {
  getAboutPageData,
};
