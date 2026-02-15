const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

const restaurantList = JSON.parse(fs.readFileSync("public/processes/restaurant_list.json", "utf8"));
const templateSource = fs.readFileSync("views/restaurant-review-template.handlebars", "utf8");
const layoutSource = fs.readFileSync("views/layouts/main.handlebars", "utf8");

// Compile templates
const template = handlebars.compile(templateSource);
const layout = handlebars.compile(layoutSource);

restaurantList.forEach(r => {
  const reviewsFile = path.join("public/data", `${r.id}_reviews.json`);
  if (!fs.existsSync(reviewsFile)) return;

  const reviewsData = JSON.parse(fs.readFileSync(reviewsFile, "utf8"));

  const content = template({ restaurant: r, reviews: reviewsData.reviews });
  const html = layout({ restaurant: r, body: content });

  const outPath = path.join("public/pages/restaurants", `${r.id}.html`);
  fs.writeFileSync(outPath, html);
  console.log(`Generated ${outPath}`);
});