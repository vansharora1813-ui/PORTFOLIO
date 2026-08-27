from PIL import Image

def analyze_projections():
    img = Image.open('assets/character_sheet.png').convert('RGB')
    w, h = img.size
    
    # Calculate non-white pixels per column
    threshold = 240
    col_density = []
    for x in range(w):
        non_white_count = 0
        for y in range(h):
            r, g, b = img.getpixel((x, y))
            if r < threshold or g < threshold or b < threshold:
                non_white_count += 1
        col_density.append(non_white_count)
        
    # Calculate non-white pixels per row
    row_density = []
    for y in range(h):
        non_white_count = 0
        for x in range(w):
            r, g, b = img.getpixel((x, y))
            if r < threshold or g < threshold or b < threshold:
                non_white_count += 1
        row_density.append(non_white_count)
        
    # Print row density summary to find horizontal division
    print("Row Density (sampled every 10 rows):")
    for y in range(0, h, 10):
        print(f"Row {y:03d}: {row_density[y]}")
        
    # Print column density summary
    print("\nColumn Density (sampled every 15 cols):")
    for x in range(0, w, 15):
        print(f"Col {x:03d}: {col_density[x]}")

if __name__ == '__main__':
    analyze_projections()
