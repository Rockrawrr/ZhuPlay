"""生成 ZhuPlay 应用图标：深色圆角方块 + 绿色"竹"字，输出多尺寸 .ico 与源 PNG"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = Path(r"E:\Project\MusicPlayer\zhuplay\build")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 1024  # 先画大图再缩小，边缘更干净
BG = (18, 18, 18, 255)          # #121212 与界面底色一致
GREEN = (30, 215, 96, 255)      # #1ed760 主题绿
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def make_icon() -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # 主体：深色圆角方块
    radius = int(SIZE * 0.22)
    draw.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=radius, fill=BG)

    # 极淡的绿色内发光（右上角），呼应首页的背景光
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (SIZE * 0.35, -SIZE * 0.25, SIZE * 1.25, SIZE * 0.75),
        fill=(30, 215, 96, 26),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(SIZE * 0.09))
    canvas.alpha_composite(glow)

    # 绿色"竹"字
    font = ImageFont.truetype(FONT_PATH, int(SIZE * 0.62))
    text = "竹"
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    text_w, text_h = right - left, bottom - top
    draw.text(
        ((SIZE - text_w) / 2 - left, (SIZE - text_h) / 2 - top),
        text,
        font=font,
        fill=GREEN,
    )

    # 裁成圆角（外面透明）
    canvas.putalpha(rounded_mask(SIZE, radius))
    return canvas


def main() -> None:
    icon = make_icon()

    png_path = OUT_DIR / "icon.png"
    icon.resize((512, 512), Image.LANCZOS).save(png_path)

    ico_path = OUT_DIR / "icon.ico"
    sizes = [16, 24, 32, 48, 64, 128, 256]
    icon.save(ico_path, format="ICO", sizes=[(s, s) for s in sizes])

    print(f"PNG: {png_path} ({png_path.stat().st_size} bytes)")
    print(f"ICO: {ico_path} ({ico_path.stat().st_size} bytes, sizes={sizes})")


if __name__ == "__main__":
    main()
