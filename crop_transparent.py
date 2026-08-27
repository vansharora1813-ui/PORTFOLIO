import os
from PIL import Image

def crop_and_save_characters():
    img = Image.open('assets/character_sheet.png').convert('RGBA')
    width, height = img.size
    
    # We want to identify opaque pixel regions (alpha > 10)
    non_transparent = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            if a > 10:
                row.append(1)
            else:
                row.append(0)
        non_transparent.append(row)
        
    visited = [[False for _ in range(width)] for _ in range(height)]
    boxes = []
    
    for y in range(height):
        for x in range(width):
            if non_transparent[y][x] and not visited[y][x]:
                # Found a new component
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                # Flood fill stack (DFS to avoid recursion limit in Python)
                stack = [(x, y)]
                visited[y][x] = True
                
                while stack:
                    cx, cy = stack.pop()
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    # Check 4-neighbors
                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if non_transparent[ny][nx] and not visited[ny][nx]:
                                visited[ny][nx] = True
                                stack.append((nx, ny))
                
                # Filter out very small noise boxes (less than 50px wide/high)
                if (max_x - min_x) > 50 and (max_y - min_y) > 50:
                    boxes.append((min_x, min_y, max_x, max_y))
                    
    print(f"Found {len(boxes)} bounding boxes:")
    
    # Sort boxes: first by row (y-coordinate), then by column (x-coordinate)
    # We can group boxes that are roughly in the same row.
    # Row 1 is around y=0, Row 2 is around y=340.
    boxes = sorted(boxes, key=lambda b: (b[1] // 100, b[0]))
    
    for idx, box in enumerate(boxes):
        w = box[2] - box[0]
        h = box[3] - box[1]
        print(f"Box {idx}: x={box[0]}, y={box[1]} to x={box[2]}, y={box[3]} (width={w}, height={h})")
        
    # Map box index to state
    # Row 1: Left, Front, Right
    # Row 2: Down, Up
    states = {
        0: 'left',
        1: 'front',
        2: 'right',
        3: 'down',
        4: 'up'
    }
    
    # Crop and save each box
    # Let's add a padding of 5px around the character for safe cropping, bounds-checked
    padding = 5
    for idx, box in enumerate(boxes):
        if idx not in states:
            print(f"Extra box found at index {idx}, skipping save.")
            continue
            
        min_x = max(0, box[0] - padding)
        min_y = max(0, box[1] - padding)
        max_x = min(width, box[2] + padding)
        max_y = min(height, box[3] + padding)
        
        cropped_img = img.crop((min_x, min_y, max_x, max_y))
        state_name = states[idx]
        output_path = f"assets/character_{state_name}.png"
        cropped_img.save(output_path, 'PNG')
        print(f"Saved {state_name} to {output_path} (size: {cropped_img.size})")

if __name__ == '__main__':
    crop_and_save_characters()
