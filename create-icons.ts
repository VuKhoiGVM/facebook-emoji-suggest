import { $ } from "bun";

async function createIcons() {
  console.log("Creating placeholder icons...");

  // Create a simple 128x128 blue square icon using ImageMagick if available
  // Otherwise, create a minimal SVG and convert

  const sizes = [16, 32, 48, 128];
  const color = "#1877F2"; // Facebook blue

  for (const size of sizes) {
    // Try using ImageMagick convert command
    try {
      await $`convert -size ${size}x${size} xc:"${color}" -fill white -gravity center -pointsize $((size/3)) -annotate 0 '😀' public/icons/icon${size}.png`.quiet();
      console.log(`✅ Created ${size}x${size} icon`);
    } catch {
      // If ImageMagick is not available, create a simple solid color placeholder
      // Using base64 encoded minimal PNG (1x1 blue pixel)
      console.warn(`ImageMagick not found, skipping ${size}x${size} icon. Please install ImageMagick or use an online icon generator.`);
      console.log(`  Visit: https://favicon.io/emoji-favicons/ to generate icons from 😀 emoji`);
    }
  }

  console.log("\nIcon creation complete!");
  console.log("If icons weren't created, visit https://favicon.io/emoji-favicons/");
  console.log("Generate icons from 😀 emoji and place them in public/icons/");
}

createIcons().catch(console.error);
