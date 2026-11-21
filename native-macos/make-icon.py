from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent
iconset = root / "Playmaker.iconset"
iconset.mkdir(exist_ok=True)
font_paths = [
    Path("/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
]
font_path = next((p for p in font_paths if p.exists()), None)
for size in (16, 32, 128, 256, 512):
    for scale in (1, 2):
        pixels = size * scale
        image = Image.new("RGBA", (pixels, pixels), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((0, 0, pixels - 1, pixels - 1), radius=int(pixels * .21), fill="#e6a833")
        font = ImageFont.truetype(str(font_path), int(pixels * .73)) if font_path else ImageFont.load_default()
        box = draw.textbbox((0, 0), "P", font=font)
        x = (pixels - (box[2] - box[0])) / 2 - box[0] - pixels * .015
        y = (pixels - (box[3] - box[1])) / 2 - box[1] - pixels * .02
        draw.text((x, y), "P", font=font, fill="#10202b")
        image.save(iconset / f"icon_{size}x{size}{'@2x' if scale == 2 else ''}.png")
