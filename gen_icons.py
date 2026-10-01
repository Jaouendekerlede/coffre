from PIL import Image, ImageDraw

# Icône : cadenas doré sur fond brun sombre dégradé.
def fond(size):
    img = Image.new("RGB", (size, size))
    haut, bas = (45, 36, 26), (19, 16, 13)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(haut[i] + (bas[i] - haut[i]) * t) for i in range(3)))
    return img

def icone(size, echelle, maskable):
    img = fond(size).convert("RGBA")
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    s = size * echelle
    or_ = (212, 175, 55, 255)
    # Anse du cadenas.
    anse_rayon = s * 0.22
    anse_cy = cy - s * 0.12
    d.arc([cx - anse_rayon, anse_cy - anse_rayon, cx + anse_rayon, anse_cy + anse_rayon], 180, 360, fill=or_, width=max(2, int(s * 0.07)))
    # Corps du cadenas.
    corps_w, corps_h = s * 0.56, s * 0.42
    corps_y = cy + s * 0.02
    d.rounded_rectangle([cx - corps_w / 2, corps_y, cx + corps_w / 2, corps_y + corps_h], radius=s * 0.08, fill=or_)
    # Trou de serrure.
    tr = s * 0.055
    tcy = corps_y + corps_h * 0.42
    d.ellipse([cx - tr, tcy - tr, cx + tr, tcy + tr], fill=fond(2).getpixel((0, 0)))
    d.rectangle([cx - tr * 0.4, tcy, cx + tr * 0.4, tcy + tr * 1.6], fill=fond(2).getpixel((0, 0)))
    if not maskable:
        masque = Image.new("L", (size, size), 0)
        ImageDraw.Draw(masque).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=255)
        sortie = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        sortie.paste(img, (0, 0), masque)
        return sortie
    return img

for s in (192, 512):
    icone(s, 1.0, False).save(f"icons/icon-{s}.png")
    icone(s, 0.78, True).save(f"icons/icon-{s}-maskable.png")
icone(256, 1.0, False).save("icons/coffre.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons ok")
