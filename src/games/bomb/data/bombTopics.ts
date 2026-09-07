import type { BombTopic } from '../types'

/** Chủ đề "kể tên" cho Bom hẹn giờ: mở, nhiều đáp án, và cạn dần khi cả bàn đã trả lời. */
export const BOMB_TOPICS: BombTopic[] = [
  {
    id: 'geo-01',
    category: 'geo',
    text: 'Kể tên tỉnh miền Tây',
  },
  {
    id: 'geo-02',
    category: 'geo',
    text: 'Kể tên tỉnh miền Trung',
  },
  {
    id: 'geo-03',
    category: 'geo',
    text: 'Kể tên tỉnh miền Bắc',
  },
  {
    id: 'geo-04',
    category: 'geo',
    text: 'Kể tên thành phố ở Việt Nam',
  },
  {
    id: 'geo-05',
    category: 'geo',
    text: 'Kể tên quốc gia châu Á',
  },
  {
    id: 'geo-06',
    category: 'geo',
    text: 'Kể tên quốc gia châu Âu',
  },
  {
    id: 'geo-07',
    category: 'geo',
    text: 'Kể tên thủ đô các nước',
  },
  {
    id: 'geo-08',
    category: 'geo',
    text: 'Kể tên địa điểm du lịch Việt Nam',
  },
  {
    id: 'geo-09',
    category: 'geo',
    text: 'Kể tên tỉnh có biển',
  },
  {
    id: 'geo-10',
    category: 'geo',
    text: 'Kể tên địa danh ở TP.HCM',
  },
  {
    id: 'food-01',
    category: 'food',
    text: 'Kể tên món ăn Việt Nam',
  },
  {
    id: 'food-02',
    category: 'food',
    text: 'Kể tên món nhậu',
  },
  {
    id: 'food-03',
    category: 'food',
    text: 'Kể tên món có thịt bò',
  },
  {
    id: 'food-04',
    category: 'food',
    text: 'Kể tên món có thịt heo',
  },
  {
    id: 'food-05',
    category: 'food',
    text: 'Kể tên món có hải sản',
  },
  {
    id: 'food-06',
    category: 'food',
    text: 'Kể tên món nước',
  },
  {
    id: 'food-07',
    category: 'food',
    text: 'Kể tên món ăn sáng',
  },
  {
    id: 'food-08',
    category: 'food',
    text: 'Kể tên món ăn đường phố',
  },
  {
    id: 'food-09',
    category: 'food',
    text: 'Kể tên món cay',
  },
  {
    id: 'food-10',
    category: 'food',
    text: 'Kể tên món ngọt',
  },
  {
    id: 'food-11',
    category: 'food',
    text: 'Kể tên loại trái cây',
  },
  {
    id: 'food-12',
    category: 'food',
    text: 'Kể tên rau củ',
  },
  {
    id: 'food-13',
    category: 'food',
    text: 'Kể tên loại bia',
  },
  {
    id: 'food-14',
    category: 'food',
    text: 'Kể tên loại nước ngọt',
  },
  {
    id: 'food-15',
    category: 'food',
    text: 'Kể tên đồ uống có cồn',
  },
  {
    id: 'entertainment-01',
    category: 'entertainment',
    text: 'Kể tên ca sĩ Việt Nam',
  },
  {
    id: 'entertainment-02',
    category: 'entertainment',
    text: 'Kể tên ca sĩ nam',
  },
  {
    id: 'entertainment-03',
    category: 'entertainment',
    text: 'Kể tên ca sĩ nữ',
  },
  {
    id: 'entertainment-04',
    category: 'entertainment',
    text: 'Kể tên rapper Việt',
  },
  {
    id: 'entertainment-05',
    category: 'entertainment',
    text: 'Kể tên diễn viên Việt Nam',
  },
  {
    id: 'entertainment-06',
    category: 'entertainment',
    text: 'Kể tên diễn viên Hollywood',
  },
  {
    id: 'entertainment-07',
    category: 'entertainment',
    text: 'Kể tên phim Việt',
  },
  {
    id: 'entertainment-08',
    category: 'entertainment',
    text: 'Kể tên phim Marvel',
  },
  {
    id: 'entertainment-09',
    category: 'entertainment',
    text: 'Kể tên phim hoạt hình',
  },
  {
    id: 'entertainment-10',
    category: 'entertainment',
    text: 'Kể tên chương trình truyền hình',
  },
  {
    id: 'entertainment-11',
    category: 'entertainment',
    text: 'Kể tên bài hát có chữ “yêu”',
  },
  {
    id: 'entertainment-12',
    category: 'entertainment',
    text: 'Kể tên bài hát có chữ “em”',
  },
  {
    id: 'entertainment-13',
    category: 'entertainment',
    text: 'Kể tên bài hát có chữ “anh”',
  },
  {
    id: 'tech-01',
    category: 'tech',
    text: 'Kể tên hãng điện thoại',
  },
  {
    id: 'tech-02',
    category: 'tech',
    text: 'Kể tên hãng laptop',
  },
  {
    id: 'tech-03',
    category: 'tech',
    text: 'Kể tên mạng xã hội',
  },
  {
    id: 'tech-04',
    category: 'tech',
    text: 'Kể tên ứng dụng nhắn tin',
  },
  {
    id: 'tech-05',
    category: 'tech',
    text: 'Kể tên trình duyệt web',
  },
  {
    id: 'tech-06',
    category: 'tech',
    text: 'Kể tên hệ điều hành',
  },
  {
    id: 'tech-07',
    category: 'tech',
    text: 'Kể tên hãng công nghệ',
  },
  {
    id: 'tech-08',
    category: 'tech',
    text: 'Kể tên ngôn ngữ lập trình',
  },
  {
    id: 'tech-09',
    category: 'tech',
    text: 'Kể tên AI chatbot',
  },
  {
    id: 'tech-10',
    category: 'tech',
    text: 'Kể tên game mobile',
  },
  {
    id: 'vehicle-01',
    category: 'vehicle',
    text: 'Kể tên hãng xe máy',
  },
  {
    id: 'vehicle-02',
    category: 'vehicle',
    text: 'Kể tên hãng ô tô',
  },
  {
    id: 'vehicle-03',
    category: 'vehicle',
    text: 'Kể tên mẫu xe Honda',
  },
  {
    id: 'vehicle-04',
    category: 'vehicle',
    text: 'Kể tên mẫu xe Yamaha',
  },
  {
    id: 'vehicle-05',
    category: 'vehicle',
    text: 'Kể tên xe SUV',
  },
  {
    id: 'vehicle-06',
    category: 'vehicle',
    text: 'Kể tên xe điện',
  },
  {
    id: 'vehicle-07',
    category: 'vehicle',
    text: 'Kể tên hãng xe sang',
  },
  {
    id: 'vehicle-08',
    category: 'vehicle',
    text: 'Kể tên màu xe phổ biến',
  },
  {
    id: 'nature-01',
    category: 'nature',
    text: 'Kể tên động vật 4 chân',
  },
  {
    id: 'nature-02',
    category: 'nature',
    text: 'Kể tên động vật sống dưới nước',
  },
  {
    id: 'nature-03',
    category: 'nature',
    text: 'Kể tên loài chim',
  },
  {
    id: 'nature-04',
    category: 'nature',
    text: 'Kể tên động vật nuôi trong nhà',
  },
  {
    id: 'nature-05',
    category: 'nature',
    text: 'Kể tên động vật nguy hiểm',
  },
  {
    id: 'nature-06',
    category: 'nature',
    text: 'Kể tên côn trùng',
  },
  {
    id: 'nature-07',
    category: 'nature',
    text: 'Kể tên loài cá',
  },
  {
    id: 'nature-08',
    category: 'nature',
    text: 'Kể tên loài hoa',
  },
  {
    id: 'nature-09',
    category: 'nature',
    text: 'Kể tên loại cây',
  },
  {
    id: 'nature-10',
    category: 'nature',
    text: 'Kể tên thứ có trong rừng',
  },
  {
    id: 'objects-01',
    category: 'objects',
    text: 'Kể tên đồ trong nhà bếp',
  },
  {
    id: 'objects-02',
    category: 'objects',
    text: 'Kể tên đồ trong phòng ngủ',
  },
  {
    id: 'objects-03',
    category: 'objects',
    text: 'Kể tên đồ trong phòng tắm',
  },
  {
    id: 'objects-04',
    category: 'objects',
    text: 'Kể tên đồ điện tử',
  },
  {
    id: 'objects-05',
    category: 'objects',
    text: 'Kể tên đồ dùng học tập',
  },
  {
    id: 'objects-06',
    category: 'objects',
    text: 'Kể tên vật thường có trong túi xách',
  },
  {
    id: 'objects-07',
    category: 'objects',
    text: 'Kể tên thứ thường có trong ví',
  },
  {
    id: 'objects-08',
    category: 'objects',
    text: 'Kể tên thứ thường có trên bàn làm việc',
  },
  {
    id: 'objects-09',
    category: 'objects',
    text: 'Kể tên thứ dùng khi đi du lịch',
  },
  {
    id: 'objects-10',
    category: 'objects',
    text: 'Kể tên đồ phải mang khi đi biển',
  },
  {
    id: 'people-01',
    category: 'people',
    text: 'Kể tên bộ phận cơ thể',
  },
  {
    id: 'people-02',
    category: 'people',
    text: 'Kể tên thứ có trên khuôn mặt',
  },
  {
    id: 'people-03',
    category: 'people',
    text: 'Kể tên nghề nghiệp',
  },
  {
    id: 'people-04',
    category: 'people',
    text: 'Kể tên nghề cần mặc đồng phục',
  },
  {
    id: 'people-05',
    category: 'people',
    text: 'Kể tên nghề làm ban đêm',
  },
  {
    id: 'people-06',
    category: 'people',
    text: 'Kể tên tính cách tốt',
  },
  {
    id: 'people-07',
    category: 'people',
    text: 'Kể tên tính cách xấu',
  },
  {
    id: 'people-08',
    category: 'people',
    text: 'Kể tên cảm xúc',
  },
  {
    id: 'people-09',
    category: 'people',
    text: 'Kể tên lý do khiến người ta tức giận',
  },
  {
    id: 'love-01',
    category: 'love',
    text: 'Kể tên lý do chia tay',
  },
  {
    id: 'love-02',
    category: 'love',
    text: 'Kể tên lý do người yêu giận',
  },
  {
    id: 'love-03',
    category: 'love',
    text: 'Kể tên món quà tặng người yêu',
  },
  {
    id: 'love-04',
    category: 'love',
    text: 'Kể tên nơi thích hợp để hẹn hò',
  },
  {
    id: 'love-05',
    category: 'love',
    text: 'Kể tên biệt danh gọi người yêu',
  },
  {
    id: 'love-06',
    category: 'love',
    text: 'Kể tên dấu hiệu đang thích một người',
  },
  {
    id: 'love-07',
    category: 'love',
    text: 'Kể tên lý do người yêu ghen',
  },
  {
    id: 'love-08',
    category: 'love',
    text: 'Kể tên việc thường làm khi nhớ người yêu',
  },
  {
    id: 'love-09',
    category: 'love',
    text: 'Kể tên thứ không nên nói với người yêu',
  },
  {
    id: 'love-10',
    category: 'love',
    text: 'Kể tên lý do quay lại với người yêu cũ',
  },
  {
    id: 'party-01',
    category: 'party',
    text: 'Kể tên lý do đi nhậu',
  },
  {
    id: 'party-02',
    category: 'party',
    text: 'Kể tên lý do từ chối đi nhậu',
  },
  {
    id: 'party-03',
    category: 'party',
    text: 'Kể tên món thường có trên bàn nhậu',
  },
  {
    id: 'party-04',
    category: 'party',
    text: 'Kể tên câu thường nghe trên bàn nhậu',
  },
  {
    id: 'party-05',
    category: 'party',
    text: 'Kể tên lý do về trễ',
  },
  {
    id: 'party-06',
    category: 'party',
    text: 'Kể tên cách xin phép người yêu đi nhậu',
  },
  {
    id: 'party-07',
    category: 'party',
    text: 'Kể tên thứ người say thường làm',
  },
  {
    id: 'party-08',
    category: 'party',
    text: 'Kể tên dấu hiệu một người sắp say',
  },
  {
    id: 'party-09',
    category: 'party',
    text: 'Kể tên lý do gọi thêm bia',
  },
  {
    id: 'party-10',
    category: 'party',
    text: 'Kể tên người không nên nhắn tin khi say',
  },
  {
    id: 'fun-01',
    category: 'fun',
    text: 'Kể tên lý do đi làm trễ',
  },
  {
    id: 'fun-02',
    category: 'fun',
    text: 'Kể tên lý do chưa có người yêu',
  },
  {
    id: 'fun-03',
    category: 'fun',
    text: 'Kể tên lý do bị người yêu block',
  },
  {
    id: 'fun-04',
    category: 'fun',
    text: 'Kể tên lý do bị seen không rep',
  },
  {
    id: 'fun-05',
    category: 'fun',
    text: 'Kể tên câu nói dối phổ biến',
  },
  {
    id: 'fun-06',
    category: 'fun',
    text: 'Kể tên lý do giả vờ bận',
  },
  {
    id: 'fun-07',
    category: 'fun',
    text: 'Kể tên thứ người nghèo vẫn thích mua',
  },
  {
    id: 'fun-08',
    category: 'fun',
    text: 'Kể tên cách tiêu tiền nhanh nhất',
  },
  {
    id: 'fun-09',
    category: 'fun',
    text: 'Kể tên thứ hay làm lúc 2 giờ sáng',
  },
  {
    id: 'fun-10',
    category: 'fun',
    text: 'Kể tên lý do sáng hôm sau hối hận',
  },
  {
    id: 'letter-01',
    category: 'letter',
    text: 'Kể tên món ăn bắt đầu bằng chữ B',
  },
  {
    id: 'letter-02',
    category: 'letter',
    text: 'Kể tên con vật bắt đầu bằng chữ C',
  },
  {
    id: 'letter-03',
    category: 'letter',
    text: 'Kể tên tỉnh bắt đầu bằng chữ H',
  },
  {
    id: 'letter-04',
    category: 'letter',
    text: 'Kể tên tên người bắt đầu bằng chữ T',
  },
  {
    id: 'letter-05',
    category: 'letter',
    text: 'Kể tên đồ vật bắt đầu bằng chữ M',
  },
  {
    id: 'letter-06',
    category: 'letter',
    text: 'Kể tên nghề nghiệp bắt đầu bằng chữ K',
  },
]
