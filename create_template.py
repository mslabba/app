"""
Create Excel template for bulk player upload
"""

import pandas as pd

# Sample data with all possible columns
sample_data = {
    'name': [
        'Virat Kohli',
        'MS Dhoni',
        'Rohit Sharma'
    ],
    'category_id': [
        'your-category-id-here',
        'your-category-id-here',
        'your-category-id-here'
    ],
    'base_price': [
        200000,
        250000,
        180000
    ],
    'photo_url': [
        'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing',
        'https://example.com/photo.jpg',
        ''
    ],
    'age': [35, 42, 36],
    'position': ['Batsman', 'Wicket-keeper', 'Batsman'],
    'specialty': ['Right-hand bat', 'Finisher', 'Captain'],
    'previous_team': ['RCB', 'CSK', 'MI'],
    'cricheroes_link': [
        'https://cricheroes.com/profile/123456',
        '',
        ''
    ],
    'matches': [200, 250, 220],
    'runs': [7000, 5000, 6500],
    'wickets': [0, 0, 0],
    'goals': ['', '', ''],
    'assists': ['', '', '']
}

# Create DataFrame
df = pd.DataFrame(sample_data)

# Save to Excel with multiple sheets
with pd.ExcelWriter('player_upload_template.xlsx', engine='openpyxl') as writer:
    # Sheet 1: Sample data
    df.to_excel(writer, sheet_name='Sample Data', index=False)
    
    # Sheet 2: Empty template
    df_empty = pd.DataFrame(columns=df.columns)
    df_empty.to_excel(writer, sheet_name='Empty Template', index=False)
    
    # Sheet 3: Instructions
    instructions = pd.DataFrame({
        'Column Name': [
            'name',
            'category_id',
            'base_price',
            'photo_url',
            'age',
            'position',
            'specialty',
            'previous_team',
            'cricheroes_link',
            'matches',
            'runs',
            'wickets',
            'goals',
            'assists'
        ],
        'Required?': [
            'YES',
            'YES',
            'YES',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No',
            'No'
        ],
        'Description': [
            'Player full name',
            'Category UUID from your event',
            'Base auction price in rupees (integer)',
            'Photo URL or Google Drive link',
            'Player age (integer)',
            'Position/Role (e.g., Batsman, Forward)',
            'Special skills (e.g., Right-hand bat)',
            'Previous team name',
            'CricHeroes profile URL',
            'Number of matches played',
            'Total runs/goals scored',
            'Wickets taken/assists',
            'Goals scored (for football)',
            'Assists (for football)'
        ],
        'Example': [
            'Virat Kohli',
            'abc-123-xyz-456',
            '200000',
            'https://drive.google.com/file/d/FILE_ID/view',
            '35',
            'Batsman',
            'Right-hand bat',
            'Royal Challengers Bangalore',
            'https://cricheroes.com/profile/123456',
            '200',
            '7000',
            '0',
            '',
            ''
        ]
    })
    instructions.to_excel(writer, sheet_name='Instructions', index=False)

print("✅ Template created: player_upload_template.xlsx")
print("\n📋 The template includes:")
print("   - Sheet 1: Sample Data (3 example players)")
print("   - Sheet 2: Empty Template (ready to fill)")
print("   - Sheet 3: Instructions (column descriptions)")
print("\n💡 Tips:")
print("   1. Use 'Empty Template' sheet to add your players")
print("   2. Get category_id from your event's category page")
print("   3. For Google Drive photos, use sharing link")
print("   4. Required columns: name, category_id, base_price")
print("   5. All other columns are optional")
