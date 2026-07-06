export interface BDDivision {
  id: string;
  name: string;
  nameEn: string;
}

export interface BDDistrict {
  id: string;
  divisionId: string;
  name: string;
  nameEn: string;
}

export interface BDUpazila {
  id: string;
  districtId: string;
  name: string;
  nameEn: string;
}

export const bdDivisions: BDDivision[] = [
  { id: '1', name: 'ঢাকা', nameEn: 'Dhaka' },
  { id: '2', name: 'চট্টগ্রাম', nameEn: 'Chattogram' },
  { id: '3', name: 'রাজশাহী', nameEn: 'Rajshahi' },
  { id: '4', name: 'খুলনা', nameEn: 'Khulna' },
  { id: '5', name: 'বরিশাল', nameEn: 'Barishal' },
  { id: '6', name: 'সিলেট', nameEn: 'Sylhet' },
  { id: '7', name: 'রংপুর', nameEn: 'Rangpur' },
  { id: '8', name: 'ময়মনসিংহ', nameEn: 'Mymensingh' }
];

export const bdDistricts: BDDistrict[] = [
  // ঢাকা বিভাগ (divisionId: '1')
  { id: '101', divisionId: '1', name: 'ঢাকা', nameEn: 'Dhaka' },
  { id: '102', divisionId: '1', name: 'গাজীপুর', nameEn: 'Gazipur' },
  { id: '103', divisionId: '1', name: 'কিশোরগঞ্জ', nameEn: 'Kishoreganj' },
  { id: '104', divisionId: '1', name: 'গোপালগঞ্জ', nameEn: 'Gopalganj' },
  { id: '105', divisionId: '1', name: 'টাঙ্গাইল', nameEn: 'Tangail' },
  { id: '106', divisionId: '1', name: 'ফরিদপুর', nameEn: 'Faridpur' },
  { id: '107', divisionId: '1', name: 'মাদারীপুর', nameEn: 'Madaripur' },
  { id: '108', divisionId: '1', name: 'মানিকগঞ্জ', nameEn: 'Manikganj' },
  { id: '109', divisionId: '1', name: 'মুন্সীগঞ্জ', nameEn: 'Munshiganj' },
  { id: '110', divisionId: '1', name: 'রাজবাড়ী', nameEn: 'Rajbari' },
  { id: '111', divisionId: '1', name: 'শরীয়তপুর', nameEn: 'Shariatpur' },
  { id: '112', divisionId: '1', name: 'নরসিংদী', nameEn: 'Narsingdi' },
  { id: '113', divisionId: '1', name: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj' },

  // চট্টগ্রাম বিভাগ (divisionId: '2')
  { id: '201', divisionId: '2', name: 'চট্টগ্রাম', nameEn: 'Chattogram' },
  { id: '202', divisionId: '2', name: 'কক্সবাজার', nameEn: "Cox's Bazar" },
  { id: '203', divisionId: '2', name: 'কুমিল্লা', nameEn: 'Cumilla' },
  { id: '204', divisionId: '2', name: 'ফেনী', nameEn: 'Feni' },
  { id: '205', divisionId: '2', name: 'নোয়াখালী', nameEn: 'Noakhali' },
  { id: '206', divisionId: '2', name: 'লক্ষ্মীপুর', nameEn: 'Lakshmipur' },
  { id: '207', divisionId: '2', name: 'চাঁদপুর', nameEn: 'Chandpur' },
  { id: '208', divisionId: '2', name: 'ব্রাহ্মণবাড়িয়া', nameEn: 'Brahmanbaria' },
  { id: '209', divisionId: '2', name: 'রাঙ্গামাটি', nameEn: 'Rangamati' },
  { id: '210', divisionId: '2', name: 'খাগড়াছড়ি', nameEn: 'Khagrachhari' },
  { id: '211', divisionId: '2', name: 'বান্দরবান', nameEn: 'Bandarban' },

  // রাজশাহী বিভাগ (divisionId: '3')
  { id: '301', divisionId: '3', name: 'রাজশাহী', nameEn: 'Rajshahi' },
  { id: '302', divisionId: '3', name: 'নাটোর', nameEn: 'Natore' },
  { id: '303', divisionId: '3', name: 'পাবনা', nameEn: 'Pabna' },
  { id: '304', divisionId: '3', name: 'বগুড়া', nameEn: 'Bogura' },
  { id: '305', divisionId: '3', name: 'নওগাঁ', nameEn: 'Naogaon' },
  { id: '306', divisionId: '3', name: 'জয়পুরহাট', nameEn: 'Joypurhat' },
  { id: '307', divisionId: '3', name: 'চাঁপাাইনবাবগঞ্জ', nameEn: 'Chapainawabganj' },
  { id: '308', divisionId: '3', name: 'সিরাজগঞ্জ', nameEn: 'Sirajganj' },

  // খুলনা বিভাগ (divisionId: '4')
  { id: '401', divisionId: '4', name: 'খুলনা', nameEn: 'Khulna' },
  { id: '402', divisionId: '4', name: 'যশোর', nameEn: 'Jessore' },
  { id: '403', divisionId: '4', name: 'সাতক্ষীরা', nameEn: 'Satkhira' },
  { id: '404', divisionId: '4', name: 'বাগেরহাট', nameEn: 'Bagerhat' },
  { id: '405', divisionId: '4', name: 'কুষ্টিয়া', nameEn: 'Kushtia' },
  { id: '406', divisionId: '4', name: 'মাগুরা', nameEn: 'Magura' },
  { id: '407', divisionId: '4', name: 'নড়াইল', nameEn: 'Narail' },
  { id: '408', divisionId: '4', name: 'মেহেরপুর', nameEn: 'Meherpur' },
  { id: '409', divisionId: '4', name: 'চুয়াডাঙ্গা', nameEn: 'Chuadanga' },
  { id: '410', divisionId: '4', name: 'ঝিনাইদহ', nameEn: 'Jhenaidah' },

  // বরিশাল বিভাগ (divisionId: '5')
  { id: '501', divisionId: '5', name: 'বরিশাল', nameEn: 'Barishal' },
  { id: '502', divisionId: '5', name: 'পটুয়াখালী', nameEn: 'Patuakhali' },
  { id: '503', divisionId: '5', name: 'ভোলা', nameEn: 'Bhola' },
  { id: '504', divisionId: '5', name: 'পিরোজপুর', nameEn: 'Pirojpur' },
  { id: '505', divisionId: '5', name: 'বরগুনা', nameEn: 'Barguna' },
  { id: '506', divisionId: '5', name: 'ঝালকাঠি', nameEn: 'Jhalokati' },

  // সিলেট বিভাগ (divisionId: '6')
  { id: '601', divisionId: '6', name: 'সিলেট', nameEn: 'Sylhet' },
  { id: '602', divisionId: '6', name: 'মৌলভীবাজার', nameEn: 'Moulvibazar' },
  { id: '603', divisionId: '6', name: 'হবিগঞ্জ', nameEn: 'Habiganj' },
  { id: '604', divisionId: '6', name: 'সুনামগঞ্জ', nameEn: 'Sunamganj' },

  // রংপুর বিভাগ (divisionId: '7')
  { id: '701', divisionId: '7', name: 'রংপুর', nameEn: 'Rangpur' },
  { id: '702', divisionId: '7', name: 'দিনাজপুর', nameEn: 'Dinajpur' },
  { id: '703', divisionId: '7', name: 'কুড়িগ্রাম', nameEn: 'Kurigram' },
  { id: '704', divisionId: '7', name: 'গাইবান্ধা', nameEn: 'Gaibandha' },
  { id: '705', divisionId: '7', name: 'নীলফামারী', nameEn: 'Nilphamari' },
  { id: '706', divisionId: '7', name: 'লালমনিরহাট', nameEn: 'Lalmonirhat' },
  { id: '707', divisionId: '7', name: 'ঠাকুরগাঁও', nameEn: 'Thakurgaon' },
  { id: '708', divisionId: '7', name: 'পঞ্চগড়', nameEn: 'Panchagarh' },

  // ময়মনসিংহ বিভাগ (divisionId: '8')
  { id: '801', divisionId: '8', name: 'ময়মনসিংহ', nameEn: 'Mymensingh' },
  { id: '802', divisionId: '8', name: 'জামালপুর', nameEn: 'Jamalpur' },
  { id: '803', divisionId: '8', name: 'নেত্রকোনা', nameEn: 'Netrokona' },
  { id: '804', divisionId: '8', name: 'শেরপুর', nameEn: 'Sherpur' }
];

export const bdUpazilas: BDUpazila[] = [
  // ঢাকা (id: '101')
  { id: '10101', districtId: '101', name: 'মিরপুর', nameEn: 'Mirpur' },
  { id: '10102', districtId: '101', name: 'ধানমণ্ডি', nameEn: 'Dhanmondi' },
  { id: '10103', districtId: '101', name: 'উত্তরা', nameEn: 'Uttara' },
  { id: '10104', districtId: '101', name: 'গুলশান', nameEn: 'Gulshan' },
  { id: '10105', districtId: '101', name: 'তেজগাঁও', nameEn: 'Tejgaon' },
  { id: '10106', districtId: '101', name: 'মতিঝিল', nameEn: 'Motijheel' },
  { id: '10107', districtId: '101', name: 'কেরানীগঞ্জ', nameEn: 'Keraniganj' },
  { id: '10108', districtId: '101', name: 'সাভার', nameEn: 'Savar' },
  { id: '10109', districtId: '101', name: 'ধামরাই', nameEn: 'Dhamrai' },
  { id: '10110', districtId: '101', name: 'দোহার', nameEn: 'Dohar' },
  { id: '10111', districtId: '101', name: 'নবাবগঞ্জ', nameEn: 'Nawabganj' },

  // গাজীপুর (id: '102')
  { id: '10201', districtId: '102', name: 'গাজীপুর সদর', nameEn: 'Gazipur Sadar' },
  { id: '10202', districtId: '102', name: 'কালীগঞ্জ', nameEn: 'Kaliganj' },
  { id: '10203', districtId: '102', name: 'কালিয়াকৈর', nameEn: 'Kaliakair' },
  { id: '10204', districtId: '102', name: 'কাপাসিয়া', nameEn: 'Kapasia' },
  { id: '10205', districtId: '102', name: 'শ্রীপুর', nameEn: 'Sreepur' },

  // কিশোরগঞ্জ (id: '103')
  { id: '10301', districtId: '103', name: 'কিশোরগঞ্জ সদর', nameEn: 'Kishoreganj Sadar' },
  { id: '10302', districtId: '103', name: 'ভৈরব', nameEn: 'Bhairab' },
  { id: '10303', districtId: '103', name: 'বাজিতপুর', nameEn: 'Bajitpur' },
  { id: '10304', districtId: '103', name: 'করিমগঞ্জ', nameEn: 'Karimganj' },
  { id: '10305', districtId: '103', name: 'নিকলী', nameEn: 'Nikli' },
  { id: '10306', districtId: '103', name: 'কুলিয়ারচর', nameEn: 'Kuliarchar' },

  // গোপালগঞ্জ (id: '104')
  { id: '10401', districtId: '104', name: 'গোপালগঞ্জ সদর', nameEn: 'Gopalganj Sadar' },
  { id: '10402', districtId: '104', name: 'টুঙ্গিপাড়া', nameEn: 'Tungipara' },
  { id: '10403', districtId: '104', name: 'কোটালীপাড়া', nameEn: 'Kotalipara' },
  { id: '10404', districtId: '104', name: 'কাশিয়ানী', nameEn: 'Kashiani' },
  { id: '10405', districtId: '104', name: 'মুকসুদপুর', nameEn: 'Muksudpur' },

  // টাঙ্গাইল (id: '105')
  { id: '10501', districtId: '105', name: 'টাঙ্গাইল সদর', nameEn: 'Tangail Sadar' },
  { id: '10502', districtId: '105', name: 'মির্জাপুর', nameEn: 'Mirzapur' },
  { id: '10503', districtId: '105', name: 'কালিহাতী', nameEn: 'Kalihati' },
  { id: '10504', districtId: '105', name: 'ঘাটাইল', nameEn: 'Ghatail' },
  { id: '10505', districtId: '105', name: 'সখিপুর', nameEn: 'Sakhipur' },
  { id: '10506', districtId: '105', name: 'মধুপুর', nameEn: 'Madhupur' },
  { id: '10507', districtId: '105', name: 'গোপালপুর', nameEn: 'Gopalpur' },

  // ফরিদপুর (id: '106')
  { id: '10601', districtId: '106', name: 'ফরিদপুর সদর', nameEn: 'Faridpur Sadar' },
  { id: '10602', districtId: '106', name: 'ভাঙ্গা', nameEn: 'Bhanga' },
  { id: '10603', districtId: '106', name: 'বোয়ালমারী', nameEn: 'Boalmari' },
  { id: '10604', districtId: '106', name: 'মধুখালী', nameEn: 'Madhukhali' },
  { id: '10605', districtId: '106', name: 'সদরপুর', nameEn: 'Sadarpur' },

  // মাদারীপুর (id: '107')
  { id: '10701', districtId: '107', name: 'মাদারীপুর সদর', nameEn: 'Madaripur Sadar' },
  { id: '10702', districtId: '107', name: 'শিবচর', nameEn: 'Sibchar' },
  { id: '10703', districtId: '107', name: 'কালকিনি', nameEn: 'Kalkini' },
  { id: '10704', districtId: '107', name: 'রাজৈর', nameEn: 'Rajoir' },

  // মানিকগঞ্জ (id: '108')
  { id: '10801', districtId: '108', name: 'মানিকগঞ্জ সদর', nameEn: 'Manikganj Sadar' },
  { id: '10802', districtId: '108', name: 'সিংগাইর', nameEn: 'Singair' },
  { id: '10803', districtId: '108', name: 'শিবালয়', nameEn: 'Shibalaya' },
  { id: '10804', districtId: '108', name: 'ঘিওর', nameEn: 'Ghior' },

  // মুন্সীগঞ্জ (id: '109')
  { id: '10901', districtId: '109', name: 'মুন্সীগঞ্জ সদর', nameEn: 'Munshiganj Sadar' },
  { id: '10902', districtId: '109', name: 'শ্রীনগর', nameEn: 'Sreenagar' },
  { id: '10903', districtId: '109', name: 'সিরাজদিখান', nameEn: 'Sirajdikhan' },
  { id: '10904', districtId: '109', name: 'লৌহজং', nameEn: 'Lohajang' },

  // রাজবাড়ী (id: '110')
  { id: '11001', districtId: '110', name: 'রাজবাড়ী সদর', nameEn: 'Rajbari Sadar' },
  { id: '11002', districtId: '110', name: 'পাংশা', nameEn: 'Pangsa' },
  { id: '11003', districtId: '110', name: 'গোয়ালন্দ', nameEn: 'Goalandar' },

  // শরীয়তপুর (id: '111')
  { id: '11101', districtId: '111', name: 'শরীয়তপুর সদর', nameEn: 'Shariatpur Sadar' },
  { id: '11102', districtId: '111', name: 'জাজিরা', nameEn: 'Jajira' },
  { id: '11103', districtId: '111', name: 'নড়িয়া', nameEn: 'Naria' },

  // নরসিংদী (id: '112')
  { id: '11201', districtId: '112', name: 'নরসিংদী সদর', nameEn: 'Narsingdi Sadar' },
  { id: '11202', districtId: '112', name: 'মাধবদী', nameEn: 'Madhabdi' },
  { id: '11203', districtId: '112', name: 'রায়পুরা', nameEn: 'Raipura' },
  { id: '11204', districtId: '112', name: 'শিবপুর', nameEn: 'Sibpur' },

  // নারায়ণগঞ্জ (id: '113')
  { id: '11301', districtId: '113', name: 'নারায়ণগঞ্জ সদর', nameEn: 'Narayanganj Sadar' },
  { id: '11302', districtId: '113', name: 'বন্দর', nameEn: 'Bandar' },
  { id: '11303', districtId: '113', name: 'সোনারগাঁও', nameEn: 'Sonargaon' },
  { id: '11304', districtId: '113', name: 'আড়াইহাজার', nameEn: 'Araihazar' },
  { id: '11305', districtId: '113', name: 'রূপগঞ্জ', nameEn: 'Rupganj' },

  // চট্টগ্রাম (id: '201')
  { id: '20101', districtId: '201', name: 'চট্টগ্রাম সদর', nameEn: 'Chittagong Sadar' },
  { id: '20102', districtId: '201', name: 'পটিয়া', nameEn: 'Patiya' },
  { id: '20103', districtId: '201', name: 'হাটহাজারী', nameEn: 'Hathazari' },
  { id: '20104', districtId: '201', name: 'সীতাকুণ্ড', nameEn: 'Sitakunda' },
  { id: '20105', districtId: '201', name: 'মিরসরাই', nameEn: 'Mirsarai' },
  { id: '20106', districtId: '201', name: 'রাঙ্গুনিয়া', nameEn: 'Rangunia' },
  { id: '20107', districtId: '201', name: 'আনোয়ারা', nameEn: 'Anwara' },
  { id: '20108', districtId: '201', name: 'বোয়ালখালী', nameEn: 'Boalkhali' },

  // কক্সবাজার (id: '202')
  { id: '20201', districtId: '202', name: 'কক্সবাজার সদর', nameEn: 'Coxs Bazar Sadar' },
  { id: '20202', districtId: '202', name: 'উখিয়া', nameEn: 'Ukhia' },
  { id: '20203', districtId: '202', name: 'টেকনাফ', nameEn: 'Teknaf' },
  { id: '20204', districtId: '202', name: 'চকরিয়া', nameEn: 'Chakaria' },
  { id: '20205', districtId: '202', name: 'মহেশখালী', nameEn: 'Moheshkhali' },
  { id: '20206', districtId: '202', name: 'রামু', nameEn: 'Ramu' },

  // কুমিল্লা (id: '203')
  { id: '20301', districtId: '203', name: 'কুমিল্লা সদর', nameEn: 'Cumilla Sadar' },
  { id: '20302', districtId: '203', name: 'লাকসাম', nameEn: 'Laksam' },
  { id: '20303', districtId: '203', name: 'চৌদ্দগ্রাম', nameEn: 'Chauddagram' },
  { id: '20304', districtId: '203', name: 'দাউদকান্দি', nameEn: 'Daudkandi' },
  { id: '20305', districtId: '203', name: 'বরুড়া', nameEn: 'Barura' },
  { id: '20306', districtId: '203', name: 'দেবিদ্বার', nameEn: 'Debidwar' },

  // ফেনী (id: '204')
  { id: '20401', districtId: '204', name: 'ফেনী সদর', nameEn: 'Feni Sadar' },
  { id: '20402', districtId: '204', name: 'দাগনভূঞা', nameEn: 'Daganbhuiyan' },
  { id: '20403', districtId: '204', name: 'ছাগলনাইয়া', nameEn: 'Chhagalnaiya' },
  { id: '20404', districtId: '204', name: 'পরশুরাম', nameEn: 'Parshuram' },

  // নোয়াখালী (id: '205')
  { id: '20501', districtId: '205', name: 'নোয়াখালী সদর', nameEn: 'Noakhali Sadar' },
  { id: '20502', districtId: '205', name: 'বেগমগঞ্জ', nameEn: 'Begumganj' },
  { id: '20503', districtId: '205', name: 'সেনবাগ', nameEn: 'Senbagh' },
  { id: '20504', districtId: '205', name: 'কোম্পানীগঞ্জ', nameEn: 'Companiganj' },
  { id: '20505', districtId: '205', name: 'হাতিয়া', nameEn: 'Hatiya' },

  // লক্ষ্মীপুর (id: '206')
  { id: '20601', districtId: '206', name: 'লক্ষ্মীপুর সদর', nameEn: 'Lakshmipur Sadar' },
  { id: '20602', districtId: '206', name: 'রায়পুর', nameEn: 'Raipur' },
  { id: '20603', districtId: '206', name: 'রামগঞ্জ', nameEn: 'Ramganj' },

  // চাঁদপুর (id: '207')
  { id: '20701', districtId: '207', name: 'চাঁদপুর সদর', nameEn: 'Chandpur Sadar' },
  { id: '20702', districtId: '207', name: 'হাজীগঞ্জ', nameEn: 'Hajiganj' },
  { id: '20703', districtId: '207', name: 'ফরিদগঞ্জ', nameEn: 'Faridganj' },

  // ব্রাহ্মণবাড়িয়া (id: '208')
  { id: '20801', districtId: '208', name: 'ব্রাহ্মণবাড়িয়া সদর', nameEn: 'Brahmanbaria Sadar' },
  { id: '20802', districtId: '208', name: 'আশুগঞ্জ', nameEn: 'Ashuganj' },
  { id: '20803', districtId: '208', name: 'সরাইল', nameEn: 'Sarail' },

  // রাঙ্গামাটি (id: '209')
  { id: '20901', districtId: '209', name: 'রাঙ্গামাটি সদর', nameEn: 'Rangamati Sadar' },
  { id: '20902', districtId: '209', name: 'কাপ্তাই', nameEn: 'Kaptai' },

  // খাগড়াছড়ি (id: '210')
  { id: '21001', districtId: '210', name: 'খাগড়াছড়ি সদর', nameEn: 'Khagrachhari Sadar' },

  // বান্দরবান (id: '211')
  { id: '21101', districtId: '211', name: 'বান্দরবান সদর', nameEn: 'Bandarban Sadar' },

  // রাজশাহী (id: '301')
  { id: '30101', districtId: '301', name: 'বোয়ালিয়া', nameEn: 'Boalia' },
  { id: '30102', districtId: '301', name: 'মতিহার', nameEn: 'Motihar' },
  { id: '30103', districtId: '301', name: 'গোদাগাড়ী', nameEn: 'Godagari' },
  { id: '30104', districtId: '301', name: 'বাঘা', nameEn: 'Bagha' },
  { id: '30105', districtId: '301', name: 'পবা', nameEn: 'Paba' },

  // নাটোর (id: '302')
  { id: '30201', districtId: '302', name: 'নাটোর সদর', nameEn: 'Natore Sadar' },
  { id: '30202', districtId: '302', name: 'সিংড়া', nameEn: 'Singra' },
  { id: '30203', districtId: '302', name: 'লালপুর', nameEn: 'Lalpur' },

  // পাবনা (id: '303')
  { id: '30301', districtId: '303', name: 'পাবনা সদর', nameEn: 'Pabna Sadar' },
  { id: '30302', districtId: '303', name: 'ঈশ্বরদী', nameEn: 'Ishwardi' },
  { id: '30303', districtId: '303', name: 'সুজানগর', nameEn: 'Sujanagar' },

  // বগুড়া (id: '304')
  { id: '30401', districtId: '304', name: 'বগুড়া সদর', nameEn: 'Bogura Sadar' },
  { id: '30402', districtId: '304', name: 'শেরপুর', nameEn: 'Sherpur' },
  { id: '30403', districtId: '304', name: 'শিবগঞ্জ', nameEn: 'Shibganj' },

  // নওগাঁ (id: '305')
  { id: '30501', districtId: '305', name: 'নওগাঁ সদর', nameEn: 'Naogaon Sadar' },
  { id: '30502', districtId: '305', name: 'পত্নীতলা', nameEn: 'Patnitala' },

  // জয়পুরহাট (id: '306')
  { id: '30601', districtId: '306', name: 'জয়পুরহাট সদর', nameEn: 'Joypurhat Sadar' },

  // চাঁপাইনবাবগঞ্জ (id: '307')
  { id: '30701', districtId: '307', name: 'চাঁপাইনবাবগঞ্জ সদর', nameEn: 'Chapainawabganj Sadar' },
  { id: '30702', districtId: '307', name: 'শিবগঞ্জ', nameEn: 'Shibganj' },

  // সিরাজগঞ্জ (id: '308')
  { id: '30801', districtId: '308', name: 'সিরাজগঞ্জ সদর', nameEn: 'Sirajganj Sadar' },
  { id: '30802', districtId: '308', name: 'শাহজাদপুর', nameEn: 'Shahjadpur' },
  { id: '30803', districtId: '308', name: 'উল্লাপাড়া', nameEn: 'Ullapara' },

  // খুলনা (id: '401')
  { id: '40101', districtId: '401', name: 'খুলনা সদর', nameEn: 'Khulna Sadar' },
  { id: '40102', districtId: '401', name: 'ডুমুরিয়া', nameEn: 'Dumuria' },
  { id: '40103', districtId: '401', name: 'রূপসা', nameEn: 'Rupsha' },

  // যশোর (id: '402')
  { id: '40201', districtId: '402', name: 'যশোর সদর', nameEn: 'Jessore Sadar' },
  { id: '40202', districtId: '402', name: 'ঝিকরগাছা', nameEn: 'Jhikargachha' },
  { id: '40203', districtId: '402', name: 'অভয়নগর', nameEn: 'Abhaynagar' },

  // সাতক্ষীরা (id: '403')
  { id: '40301', districtId: '403', name: 'সাতক্ষীরা সদর', nameEn: 'Satkhira Sadar' },
  { id: '40302', districtId: '403', name: 'শ্যামনগর', nameEn: 'Shyamnagar' },

  // বাগেরহাট (id: '404')
  { id: '40401', districtId: '404', name: 'বাগেরহাট সদর', nameEn: 'Bagerhat Sadar' },
  { id: '40402', districtId: '404', name: 'মোংলা', nameEn: 'Mongla' },

  // কুষ্টিয়া (id: '405')
  { id: '40501', districtId: '405', name: 'কুষ্টিয়া সদর', nameEn: 'Kushtia Sadar' },
  { id: '40502', districtId: '405', name: 'কুমারখালী', nameEn: 'Kumarkhali' },

  // মাগুরা (id: '406')
  { id: '40601', districtId: '406', name: 'মাগুরা সদর', nameEn: 'Magura Sadar' },

  // নড়াইল (id: '407')
  { id: '40701', districtId: '407', name: 'নড়াইল সদর', nameEn: 'Narail Sadar' },

  // মেহেরপুর (id: '408')
  { id: '40801', districtId: '408', name: 'মেহেরপুর সদর', nameEn: 'Meherpur Sadar' },

  // চুয়াডাঙ্গা (id: '409')
  { id: '40901', districtId: '409', name: 'চুয়াডাঙ্গা সদর', nameEn: 'Chuadanga Sadar' },

  // ঝিনাইদহ (id: '410')
  { id: '41001', districtId: '410', name: 'ঝিনাইদহ সদর', nameEn: 'Jhenaidah Sadar' },
  { id: '41002', districtId: '410', name: 'কালীগঞ্জ', nameEn: 'Kaliganj' },

  // বরিশাল (id: '501')
  { id: '50101', districtId: '501', name: 'বরিশাল সদর', nameEn: 'Barishal Sadar' },
  { id: '50102', districtId: '501', name: 'Bakerganj', nameEn: 'বাকেরগঞ্জ' },

  // পটুয়াখালী (id: '502')
  { id: '50201', districtId: '502', name: 'পটুয়াখালী সদর', nameEn: 'Patuakhali Sadar' },
  { id: '50202', districtId: '502', name: 'কলাপাড়া', nameEn: 'Kalapara' },

  // ভোলা (id: '503')
  { id: '50301', districtId: '503', name: 'ভোলা সদর', nameEn: 'Bhola Sadar' },
  { id: '50302', districtId: '503', name: 'চরফ্যাশন', nameEn: 'Char Fasson' },

  // পিরোজপুর (id: '504')
  { id: '50401', districtId: '504', name: 'পিরোজপুর সদর', nameEn: 'Pirojpur Sadar' },

  // বরগুনা (id: '505')
  { id: '50501', districtId: '505', name: 'বরগুনা সদর', nameEn: 'Barguna Sadar' },

  // ঝালকাঠি (id: '506')
  { id: '50601', districtId: '506', name: 'ঝালকাঠি সদর', nameEn: 'Jhalokati Sadar' },

  // সিলেট (id: '601')
  { id: '60101', districtId: '601', name: 'সিলেট সদর', nameEn: 'Sylhet Sadar' },
  { id: '60102', districtId: '601', name: 'বিয়ানীবাজার', nameEn: 'Beanibazar' },
  { id: '60103', districtId: '601', name: 'গোলাপগঞ্জ', nameEn: 'Golapganj' },

  // মৌলভীবাজার (id: '602')
  { id: '60201', districtId: '602', name: 'মৌলভীবাজার সদর', nameEn: 'Moulvibazar Sadar' },
  { id: '60202', districtId: '602', name: 'শ্রীমঙ্গল', nameEn: 'Sreemangal' },

  // হবিগঞ্জ (id: '603')
  { id: '60301', districtId: '603', name: 'হবিগঞ্জ সদর', nameEn: 'Habiganj Sadar' },

  // সুনামগঞ্জ (id: '604')
  { id: '60401', districtId: '604', name: 'সুনামগঞ্জ সদর', nameEn: 'Sunamganj Sadar' },

  // রংপুর (id: '701')
  { id: '70101', districtId: '701', name: 'রংপুর সদর', nameEn: 'Rangpur Sadar' },
  { id: '70102', districtId: '701', name: 'মিঠাপুকুর', nameEn: 'Mithapukur' },

  // দিনাজপুর (id: '702')
  { id: '70201', districtId: '702', name: 'দিনাজপুর সদর', nameEn: 'Dinajpur Sadar' },

  // কুড়িগ্রাম (id: '703')
  { id: '70301', districtId: '703', name: 'কুড়িগ্রাম সদর', nameEn: 'Kurigram Sadar' },

  // গাইবান্ধা (id: '704')
  { id: '70401', districtId: '704', name: 'গাইবান্ধা সদর', nameEn: 'Gaibandha Sadar' },

  // নীলফামারী (id: '705')
  { id: '70501', districtId: '705', name: 'নীলফামারী সদর', nameEn: 'Nilphamari Sadar' },

  // লালমনিরহাট (id: '706')
  { id: '70601', districtId: '706', name: 'লালমনিরহাট সদর', nameEn: 'Lalmonirhat Sadar' },

  // ঠাকুরগাঁও (id: '707')
  { id: '70701', districtId: '707', name: 'ঠাকুরগাঁও সদর', nameEn: 'Thakurgaon Sadar' },

  // পঞ্চগড় (id: '708')
  { id: '70801', districtId: '708', name: 'পঞ্চগড় সদর', nameEn: 'Panchagarh Sadar' },

  // ময়মনসিংহ (id: '801')
  { id: '80101', districtId: '801', name: 'ময়মনসিংহ সদর', nameEn: 'Mymensingh Sadar' },
  { id: '80102', districtId: '801', name: 'ত্রিশাল', nameEn: 'Trishal' },
  { id: '80103', districtId: '801', name: 'ভালুকা', nameEn: 'Bhaluka' },

  // জামালপুর (id: '802')
  { id: '80201', districtId: '802', name: 'জামালপুর সদর', nameEn: 'Jamalpur Sadar' },

  // নেত্রকোনা (id: '803')
  { id: '80301', districtId: '803', name: 'নেত্রকোনা সদর', nameEn: 'Netrokona Sadar' },

  // শেরপুর (id: '804')
  { id: '80401', districtId: '804', name: 'শেরপুর সদর', nameEn: 'Sherpur Sadar' }
];

export const getThanasByUpazila = (upazilaName: string) => {
  return [
    { id: `t-1`, name: `${upazilaName} থানা`, nameEn: `${upazilaName} Thana` },
    { id: `t-2`, name: `${upazilaName} সদর থানা`, nameEn: `${upazilaName} Sadar Thana` },
    { id: `t-3`, name: `${upazilaName} মডেল থানা`, nameEn: `${upazilaName} Model Thana` }
  ];
};

export const getUnionsByThana = (thanaName: string) => {
  // Returns generic representations of 1-9 Wards/Unions
  const arr = [];
  for(let i=1; i<=9; i++) {
     arr.push({ id: `u-${i}`, name: `${i.toLocaleString('bn-BD')} নং ইউনিয়ন/ওয়ার্ড`, nameEn: `Ward/Union ${i}` });
  }
  return arr;
};

export const getUnionsByUpazila = (upazilaName: string) => {
  // Returns generic representations of 1-9 Wards/Unions
  const arr = [];
  for(let i=1; i<=9; i++) {
     arr.push({ id: `u-${i}`, name: `${i.toLocaleString('bn-BD')} নং ইউনিয়ন/ওয়ার্ড`, nameEn: `Ward/Union ${i}` });
  }
  return arr;
};

export const getVillagesByUnion = (unionName: string) => {
  const vnames = ['উত্তর পাড়া', 'দক্ষিণ পাড়া', 'পূর্ব পাড়া', 'পশ্চিম পাড়া', 'মধ্য পাড়া', 'নতুন পাড়া', 'সদর এলাকা', 'বাজার সংলগ্ন', 'মসজিদ এলাকা'];
  return vnames.map((name, i) => ({ id: `v-${i+1}`, name, nameEn: `Area ${i+1}` }));
};

