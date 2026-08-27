from PIL import Image

def find_character_bounding_boxes():
    img = Image.open('assets/character_sheet.png').convert('RGBA')
    width, height = img.size
    
    # We want to identify non-white pixel regions.
    # Let's create a binary grid representing non-white pixels.
    # Background is solid white (255, 255, 255). We will threshold it.
    threshold = 240
    non_white = []
    
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # If the pixel is not white
            if r < threshold or g < threshold or b < threshold:
                row.append(1)
            else:
                row.append(0)
        non_white.append(row)
        
    # Let's find connected components (bounding boxes) using a simple flood fill or connected components algorithm.
    visited = [[False for _ in range(width)] for _ in range(height)]
    boxes = []
    
    for y in range(height):
        for x in range(width):
            if non_white[y][x] and not visited[y][x]:
                # Found a new component
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                # Flood fill stack
                queue = [(x, y)]
                visited[y][x] = True
                
                while queue:
                    cx, cy = queue.pop(0)
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    # Check 4-neighbors
                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if non_white[ny][nx] and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                
                # Filter out very small noise boxes (less than 50px wide/high)
                if (max_x - min_x) > 50 and (max_y - min_y) > 50:
                    boxes.append((min_x, min_y, max_x, max_y))
                    
    print(f"Found {len(boxes)} bounding boxes:")
    for idx, box in enumerate(boxes):
        w = box[2] - box[0]
        h = box[3] - box[1]
        print(f"Box {idx}: x={box[0]}, y={box[1]} to x={box[2]}, y={box[3]} (width={w}, height={h})")

if __name__ == '__main__':
    find_character_bounding_boxes()
