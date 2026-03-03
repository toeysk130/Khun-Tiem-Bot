"""Generate a celebration confetti APNG for LINE Flex Message POC."""
from PIL import Image, ImageDraw
import random
import math

WIDTH, HEIGHT = 560, 560   # smaller = smaller file size (LINE limit: 300KB)
FRAMES = 20
COLORS = [
    "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
    "#C77DFF", "#F4A261", "#2EC4B6", "#E91E63"
]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# Seed confetti pieces
random.seed(2024)
pieces = []
for _ in range(55):
    pieces.append({
        'x': random.randint(0, WIDTH),
        'y': random.randint(-HEIGHT, HEIGHT),
        'w': random.randint(12, 28),
        'h': random.randint(8, 18),
        'angle': random.uniform(0, 360),
        'spin': random.uniform(-8, 8),
        'speed': random.uniform(12, 30),
        'color': hex_to_rgb(random.choice(COLORS)),
        'shape': random.choice(['rect', 'circle', 'rect']),
    })

frames = []
for f in range(FRAMES):
    img = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    for p in pieces:
        y = (p['y'] + f * p['speed']) % (HEIGHT + 100)
        x = p['x'] + math.sin(f * 0.3 + p['angle']) * 12
        angle = (p['angle'] + f * p['spin']) % 360

        # Draw piece as a rotated patch via small rotated image
        piece_img = Image.new('RGBA', (p['w'], p['h']), (0, 0, 0, 0))
        piece_draw = ImageDraw.Draw(piece_img)
        if p['shape'] == 'circle':
            piece_draw.ellipse([0, 0, p['w']-1, p['h']-1], fill=p['color'] + (230,))
        else:
            piece_draw.rectangle([0, 0, p['w']-1, p['h']-1], fill=p['color'] + (230,))
        piece_img = piece_img.rotate(angle, expand=True)
        img.paste(piece_img, (int(x - piece_img.width//2), int(y - piece_img.height//2)), piece_img)

    # Text: 🎉 in the center (frame 8–20 fade in/out)
    if 5 <= f <= 25:
        center_img = Image.new('RGBA', (400, 100), (0, 0, 0, 0))
        cdraw = ImageDraw.Draw(center_img)
        alpha = min(255, (f - 5) * 30) if f < 15 else max(0, (25 - f) * 30)
        cdraw.text((10, 10), "🎉 ไม่มีใครลาพรุ่งนี้", fill=(50, 50, 50, alpha))
        img.paste(center_img, (200, 350), center_img)

    frames.append(img)

# Save as APNG
output_path = "/Users/cappuccino/Desktop/projects/Khun-Tiem-Bot/assets/celebration.png"
import os; os.makedirs(os.path.dirname(output_path), exist_ok=True)

frames[0].save(
    output_path,
    save_all=True,
    append_images=frames[1:],
    duration=80,
    loop=0,
    format='PNG'
)
print(f"APNG saved to {output_path} ({os.path.getsize(output_path) // 1024}KB)")
