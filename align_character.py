from PIL import Image

def find_red_anchors_and_align():
    img = Image.open('assets/character_sheet.png').convert('RGB')
    w, h = img.size
    
    # Define search regions to isolate each character pose
    regions = {
        'left': (0, 0, 340, 360),
        'front': (340, 0, 680, 360),
        'right': (680, 0, 1024, 360),
        'down': (150, 360, 500, 682),
        'up': (500, 360, 850, 682)
    }
    
    anchors = {}
    
    # 1. Find the red collar lining center for each pose
    for name, rect in regions.items():
        min_x, min_y, max_x, max_y = rect
        red_pixels = []
        
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                r, g, b = img.getpixel((x, y))
                if r > 100 and g < 40 and b < 50:
                    red_pixels.append((x, y))
                    
        if red_pixels:
            avg_x = sum(p[0] for p in red_pixels) / len(red_pixels)
            avg_y = sum(p[1] for p in red_pixels) / len(red_pixels)
            anchors[name] = (avg_x, avg_y)
            print(f"Pose '{name}': Red anchor at X={avg_x:.1f}, Y={avg_y:.1f}")
        else:
            print(f"Error: Could not find red anchor for '{name}'")
            
    # 2. Define output canvas size and relative anchor position
    # The collar is near the bottom of the character.
    # Canvas size: 300x380 (provides plenty of space for heads and ears)
    canvas_w, canvas_h = 300, 380
    
    # We want the collar anchor to be at (150, 275) in the output canvas
    anchor_out_x = 150
    anchor_out_y = 275
    
    img_rgba = Image.open('assets/character_sheet.png').convert('RGBA')
    
    for name, anchor in anchors.items():
        ax, ay = anchor
        
        # Create a new transparent image for the output
        canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        
        # Map pixels from original sheet to canvas
        for cy in range(canvas_h):
            for cx in range(canvas_w):
                # Calculate corresponding coordinates in the source sheet
                sx = int(ax - anchor_out_x + cx)
                sy = int(ay - anchor_out_y + cy)
                
                # If coordinate is within sheet boundaries, copy pixel
                if 0 <= sx < w and 0 <= sy < h:
                    r, g, b, a = img_rgba.getpixel((sx, sy))
                    
                    # Remove any leftover white/gray background pixels
                    # by checking if it is a solid white pixel
                    if r > 245 and g > 245 and b > 245:
                        canvas.putpixel((cx, cy), (0, 0, 0, 0))
                    else:
                        canvas.putpixel((cx, cy), (r, g, b, a))
                        
        output_path = f"assets/character_{name}.png"
        canvas.save(output_path, 'PNG')
        print(f"Aligned and saved '{name}' to {output_path} (size: {canvas.size})")

if __name__ == '__main__':
    find_red_anchors_and_align()
