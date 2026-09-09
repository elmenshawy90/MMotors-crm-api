-- Add branch-specific fields to knowledge_categories table
ALTER TABLE knowledge_categories 
ADD COLUMN IF NOT EXISTS branch_address TEXT,
ADD COLUMN IF NOT EXISTS branch_working_hours_day VARCHAR(100),
ADD COLUMN IF NOT EXISTS branch_working_hours_night VARCHAR(100),
ADD COLUMN IF NOT EXISTS branch_manager VARCHAR(200),
ADD COLUMN IF NOT EXISTS branch_phone VARCHAR(20);

-- Insert El Haykstep branch data (replace with actual category ID)
UPDATE knowledge_categories 
SET 
  branch_address = 'رقم 216 شارع جوزيف تيتو - خلف المطار القديم ( نخلى ملاهى السندباد على الشمال وسور المطار على اليمين نكمل مباشره مع سور المطار هنقابل كوبرى الحرفيين مش هنطلق الكوبرى هنكمل من اسفل الكوبرى الى ان تظهر لافته المركز على الشمال مع اليوترن هنكون امام المركز',
  branch_working_hours_day = 'يوميا عدا الجمعه من الساعه 9:5',
  branch_working_hours_night = 'يوميا عدا الجمعه من الساعه 9:3',
  branch_manager = 'حسن سليم - مدير فرع الهاكستيب',
  branch_phone = '01116777865'
WHERE name = 'El Haykstep' OR name_ar = 'الهاكستيب';
