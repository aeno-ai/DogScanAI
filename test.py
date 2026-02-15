import os
import shutil
import json
from pathlib import Path

# ========== Configuration ==========
TRAIN_DIR = "dogs"  # Your training folder with breed subfolders
OUTPUT_DIR = "breed_library_images"  # Where to save the extracted images
CLASS_INFO_FILE = "models/class_names.json"  # Your class info file

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load class info to get proper breed names and IDs
with open(CLASS_INFO_FILE, 'r', encoding='utf-8') as f:
    class_info = json.load(f)

print("="*70)
print("EXTRACTING ONE IMAGE PER BREED")
print("="*70)
print(f"Source: {TRAIN_DIR}")
print(f"Output: {OUTPUT_DIR}")
print("="*70)

extracted_count = 0
skipped_count = 0
image_mapping = []

# Process each breed folder
breed_folders = sorted([f for f in os.listdir(TRAIN_DIR) 
                       if os.path.isdir(os.path.join(TRAIN_DIR, f))])

for idx, folder_name in enumerate(breed_folders):
    folder_path = os.path.join(TRAIN_DIR, folder_name)
    
    # Get all image files in this folder
    image_files = [f for f in os.listdir(folder_path) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp'))]
    
    if not image_files:
        print(f"⚠️  Skipped: {folder_name} (no images found)")
        skipped_count += 1
        continue
    
    # Get breed info from class_info.json
    breed = class_info[idx]
    breed_id = breed['breed_id']
    breed_name = breed['display_name']
    class_name = breed['class_name']
    
    # Select the first image
    source_image_path = os.path.join(folder_path, image_files[0])
    
    # Get file extension
    file_extension = os.path.splitext(image_files[0])[1].lower()
    
    # Create new filename: "001_Affenpinscher.jpg"
    new_filename = f"{breed_id:03d}_{class_name.replace(' ', '_')}{file_extension}"
    destination_path = os.path.join(OUTPUT_DIR, new_filename)
    
    # Copy the image
    try:
        shutil.copy2(source_image_path, destination_path)
        
        # Store mapping information
        image_mapping.append({
            "breed_id": breed_id,
            "class_index": idx,
            "class_name": class_name,
            "display_name": breed_name,
            "original_filename": image_files[0],
            "new_filename": new_filename,
            "image_url": f"/images/breeds/{new_filename}"
        })
        
        extracted_count += 1
        print(f"✅ {breed_id:3d}. {breed_name:35s} → {new_filename}")
        
    except Exception as e:
        print(f"❌ Error copying {breed_name}: {e}")
        skipped_count += 1

# Save mapping to JSON file
mapping_file = "breed_images_mapping.json"
with open(mapping_file, 'w', encoding='utf-8') as f:
    json.dump(image_mapping, f, indent=2, ensure_ascii=False)

print("="*70)
print(f"\n✅ EXTRACTION COMPLETE!")
print(f"   • Extracted: {extracted_count} images")
if skipped_count > 0:
    print(f"   • Skipped: {skipped_count} breeds")
print(f"   • Images saved to: {OUTPUT_DIR}/")
print(f"   • Mapping saved to: {mapping_file}")

print("\n📋 NEXT STEPS:")
print("   1. Check the images in 'breed_library_images/' folder")
print("   2. Copy them to your project: public/images/breeds/")
print("   3. Run 'python generate_chatgpt_prompt.py' to create the prompt")
print("   4. Use ChatGPT to generate full breed data")
print("="*70)

# Also create a quick preview file
preview_file = "extracted_images_preview.txt"
with open(preview_file, 'w', encoding='utf-8') as f:
    f.write("EXTRACTED BREED IMAGES\n")
    f.write("="*70 + "\n\n")
    for item in image_mapping:
        f.write(f"{item['breed_id']:3d}. {item['display_name']:35s} → {item['new_filename']}\n")

print(f"\n📄 Preview list saved to: {preview_file}")