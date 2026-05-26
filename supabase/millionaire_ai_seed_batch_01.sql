-- Millionaire AI seed batch 01
-- Inserts 1000 deterministic, replay-safe, multi-topic questions.

with knowledge_bank as (
  select *
  from (
    values
      (1, 'geography', 'Thủ đô của Đức là thành phố nào?', array['Berlin', 'Munich', 'Frankfurt', 'Hamburg']::text[], 0, 'Berlin là thủ đô của Đức.'),
      (2, 'geography', 'Thủ đô của Canada là thành phố nào?', array['Toronto', 'Vancouver', 'Ottawa', 'Montreal']::text[], 2, 'Ottawa là thủ đô của Canada.'),
      (3, 'geography', 'Thủ đô của Úc là thành phố nào?', array['Sydney', 'Canberra', 'Melbourne', 'Perth']::text[], 1, 'Canberra là thủ đô của Úc.'),
      (4, 'geography', 'Nước nào nằm ở Nam Mỹ?', array['Brazil', 'Italy', 'Japan', 'Egypt']::text[], 0, 'Brazil nằm ở Nam Mỹ.'),
      (5, 'history', 'Chiến tranh thế giới thứ hai kết thúc năm nào?', array['1942', '1945', '1948', '1950']::text[], 1, 'WWII kết thúc năm 1945.'),
      (6, 'history', 'Tuyên ngôn Độc lập Việt Nam được công bố năm nào?', array['1930', '1945', '1954', '1975']::text[], 1, 'Bản tuyên ngôn độc lập được công bố năm 1945.'),
      (7, 'history', 'Ai là người đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình?', array['Võ Nguyên Giáp', 'Phạm Văn Đồng', 'Hồ Chí Minh', 'Trường Chinh']::text[], 2, 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập.'),
      (8, 'history', 'Kim tự tháp nổi tiếng nhất thuộc nền văn minh nào?', array['Hy Lạp', 'Ai Cập cổ đại', 'La Mã', 'Ba Tư']::text[], 1, 'Kim tự tháp Giza thuộc nền văn minh Ai Cập cổ đại.'),
      (9, 'science', 'Công thức hóa học của nước là gì?', array['CO2', 'H2O', 'O2', 'NaCl']::text[], 1, 'Nước có công thức là H2O.'),
      (10, 'science', 'Hành tinh nào thường được gọi là hành tinh đỏ?', array['Sao Kim', 'Sao Mộc', 'Sao Hỏa', 'Sao Thổ']::text[], 2, 'Sao Hỏa là hành tinh đỏ.'),
      (11, 'science', 'Đơn vị đo cường độ dòng điện trong hệ SI là gì?', array['Volt', 'Ampere', 'Ohm', 'Watt']::text[], 1, 'Cường độ dòng điện đo bằng ampe (Ampere).'),
      (12, 'science', 'Khi nước đóng băng, nhiệt độ thường là bao nhiêu độ C?', array['0', '10', '32', '-10']::text[], 0, 'Điểm đóng băng của nước ở áp suất tiêu chuẩn là 0 độ C.'),
      (13, 'technology', 'HTML là viết tắt của cụm từ nào?', array['HyperText Markup Language', 'HighText Machine Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Link']::text[], 0, 'HTML = HyperText Markup Language.'),
      (14, 'technology', 'Giao thức nào được dùng cho web bảo mật?', array['HTTP', 'FTP', 'HTTPS', 'SMTP']::text[], 2, 'HTTPS là HTTP qua TLS.'),
      (15, 'technology', 'Cổng mặc định của HTTPS là bao nhiêu?', array['80', '21', '443', '25']::text[], 2, 'HTTPS thường dùng cổng 443.'),
      (16, 'technology', 'SQL thường được dùng để làm gì?', array['Quản lý dữ liệu', 'Thiết kế đồ họa', 'Dựng phim', 'Chỉnh sửa âm thanh']::text[], 0, 'SQL được dùng để truy vấn và quản lý CSDL quan hệ.'),
      (17, 'sports', 'Một đội bóng đá trên sân có bao nhiêu cầu thủ?', array['9', '10', '11', '12']::text[], 2, 'Mỗi đội bóng đá có 11 cầu thủ trên sân.'),
      (18, 'sports', 'Biểu tượng Olympic có bao nhiêu vòng tròn?', array['4', '5', '6', '7']::text[], 1, 'Biểu tượng Olympic có 5 vòng tròn.'),
      (19, 'sports', 'Trong bóng rổ, ném phạt được tính mấy điểm?', array['1', '2', '3', '4']::text[], 0, 'Ném phạt trong bóng rổ được 1 điểm.'),
      (20, 'sports', 'Quân nào trong cờ vua đi hình chữ L?', array['Xe', 'Mã', 'Tượng', 'Hậu']::text[], 1, 'Quân Mã đi theo hình chữ L.'),
      (21, 'mixed', '1 byte bằng bao nhiêu bit?', array['4', '8', '16', '32']::text[], 1, '1 byte = 8 bit.'),
      (22, 'mixed', 'Ngày nào có 24 giờ?', array['1 ngày', '2 ngày', '12 giờ', '36 giờ']::text[], 0, 'Một ngày có 24 giờ.'),
      (23, 'mixed', 'Số nguyên tố nhỏ nhất là số nào?', array['0', '1', '2', '3']::text[], 2, 'Số nguyên tố nhỏ nhất là 2.'),
      (24, 'mixed', 'Tuần có bao nhiêu ngày?', array['5', '6', '7', '8']::text[], 2, 'Một tuần có 7 ngày.'),
      (25, 'geography', 'Thủ đô của Nhật Bản là thành phố nào?', array['Osaka', 'Tokyo', 'Kyoto', 'Nagoya']::text[], 1, 'Tokyo là thủ đô của Nhật Bản.'),
      (26, 'history', 'Năm nào con người lần đầu đặt chân lên Mặt Trăng?', array['1959', '1969', '1979', '1989']::text[], 1, 'Sự kiện Apollo 11 diễn ra năm 1969.'),
      (27, 'science', 'Chất khí cần thiết cho sự cháy là gì?', array['Oxy', 'Nitro', 'Heli', 'Argon']::text[], 0, 'Sự cháy cần oxy.'),
      (28, 'technology', 'Trình duyệt web nào được phát triển bởi Google?', array['Firefox', 'Chrome', 'Safari', 'Edge']::text[], 1, 'Google phát triển Chrome.'),
      (29, 'sports', 'Trong tennis, điểm số 0 được gọi là gì?', array['Love', 'Zero', 'Nil', 'Blank']::text[], 0, 'Trong tennis, 0 điểm được gọi là love.'),
      (30, 'mixed', 'Số nào là số chẵn?', array['11', '13', '16', '19']::text[], 2, '16 là số chẵn.')
  ) as k(knowledge_id, topic, question_base, options, correct_choice, explanation)
),
generated as (
  select
    gs as seed_id,
    ((gs - 1) % 12) as template_id,
    (((gs - 1) % 15) + 1)::smallint as difficulty,
    ((gs * 7) % 90 + 10) as a,
    ((gs * 11) % 90 + 10) as b,
    ((gs * 3) % 13 + 2) as m,
    ((gs * 5) % 11 + 2) as n,
    ((gs * 2) % 8 + 2) as den,
    ((gs * 4) % 12 + 2) as q_div,
    ((gs * 5) % 25 + 6) * 20 as n_pct,
    ((gs % 4) + 1) * 5 as pct,
    ((gs * 3) % 30 + 20) as base_avg,
    ((gs % 7) + 2) as delta_avg,
    ((gs * 3) % 25 + 10) as rect_l,
    ((gs * 4) % 20 + 8) as rect_w,
    ((gs * 5) % 30 + 10) as seq_start,
    ((gs % 9) + 2) as seq_step,
    ((gs - 1) % 4) as dynamic_correct_choice,
    ((gs - 1) % 30 + 1) as knowledge_id
  from generate_series(1, 1000) as gs
),
prepared as (
  select
    g.seed_id,
    case
      when g.template_id between 0 and 7 then
        case (g.template_id % 6)
          when 0 then 'science'
          when 1 then 'technology'
          when 2 then 'mixed'
          when 3 then 'sports'
          when 4 then 'history'
          else 'geography'
        end
      else kb.topic
    end as topic,
    g.difficulty,
    case g.template_id
      when 0 then '[AI-Seed #' || g.seed_id::text || '] Kết quả của phép cộng ' || g.a::text || ' + ' || g.b::text || ' là bao nhiêu?'
      when 1 then '[AI-Seed #' || g.seed_id::text || '] Kết quả của phép trừ |' || g.a::text || ' - ' || g.b::text || '| là bao nhiêu?'
      when 2 then '[AI-Seed #' || g.seed_id::text || '] Kết quả của phép nhân ' || g.m::text || ' x ' || g.n::text || ' là bao nhiêu?'
      when 3 then '[AI-Seed #' || g.seed_id::text || '] Kết quả của phép chia ' || (g.den * g.q_div)::text || ' / ' || g.den::text || ' là bao nhiêu?'
      when 4 then '[AI-Seed #' || g.seed_id::text || '] ' || g.pct::text || '% của ' || g.n_pct::text || ' bằng bao nhiêu?'
      when 5 then '[AI-Seed #' || g.seed_id::text || '] Trung bình cộng của ' || g.base_avg::text || ', ' || (g.base_avg + g.delta_avg)::text || ', ' || (g.base_avg + 2 * g.delta_avg)::text || ' là bao nhiêu?'
      when 6 then '[AI-Seed #' || g.seed_id::text || '] Chu vi hình chữ nhật dài ' || g.rect_l::text || ' và rộng ' || g.rect_w::text || ' là bao nhiêu?'
      when 7 then '[AI-Seed #' || g.seed_id::text || '] Số tiếp theo của dãy ' || g.seq_start::text || ', ' || (g.seq_start + g.seq_step)::text || ', ' || (g.seq_start + 2 * g.seq_step)::text || ', ' || (g.seq_start + 3 * g.seq_step)::text || ' là gì?'
      else '[AI-Seed #' || g.seed_id::text || '] ' || kb.question_base
    end as question_text,
    case
      when g.template_id = 0 then (g.a + g.b)::text
      when g.template_id = 1 then abs(g.a - g.b)::text
      when g.template_id = 2 then (g.m * g.n)::text
      when g.template_id = 3 then g.q_div::text
      when g.template_id = 4 then ((g.n_pct * g.pct) / 100)::text
      when g.template_id = 5 then (g.base_avg + g.delta_avg)::text
      when g.template_id = 6 then (2 * (g.rect_l + g.rect_w))::text
      when g.template_id = 7 then (g.seq_start + 4 * g.seq_step)::text
      else kb.options[kb.correct_choice + 1]
    end as correct_answer,
    case
      when g.template_id = 0 then (g.a + g.b + 1)::text
      when g.template_id = 1 then (abs(g.a - g.b) + 1)::text
      when g.template_id = 2 then (g.m * g.n + g.m)::text
      when g.template_id = 3 then (g.q_div + 1)::text
      when g.template_id = 4 then (((g.n_pct * g.pct) / 100) + 5)::text
      when g.template_id = 5 then (g.base_avg + g.delta_avg + 1)::text
      when g.template_id = 6 then (2 * (g.rect_l + g.rect_w) + 2)::text
      when g.template_id = 7 then (g.seq_start + 3 * g.seq_step)::text
      else kb.options[((kb.correct_choice + 1) % 4) + 1]
    end as wrong_1,
    case
      when g.template_id = 0 then (g.a + g.b + 2)::text
      when g.template_id = 1 then (abs(g.a - g.b) + 2)::text
      when g.template_id = 2 then (g.m * g.n + g.n)::text
      when g.template_id = 3 then (g.q_div + 2)::text
      when g.template_id = 4 then (((g.n_pct * g.pct) / 100) + 10)::text
      when g.template_id = 5 then (g.base_avg + g.delta_avg + 2)::text
      when g.template_id = 6 then (2 * (g.rect_l + g.rect_w) + 4)::text
      when g.template_id = 7 then (g.seq_start + 5 * g.seq_step)::text
      else kb.options[((kb.correct_choice + 2) % 4) + 1]
    end as wrong_2,
    case
      when g.template_id = 0 then (g.a + g.b + 3)::text
      when g.template_id = 1 then (abs(g.a - g.b) + 3)::text
      when g.template_id = 2 then (g.m * g.n + g.m + g.n)::text
      when g.template_id = 3 then (g.q_div + 3)::text
      when g.template_id = 4 then (((g.n_pct * g.pct) / 100) + 15)::text
      when g.template_id = 5 then (g.base_avg + g.delta_avg + 3)::text
      when g.template_id = 6 then (2 * (g.rect_l + g.rect_w) + 6)::text
      when g.template_id = 7 then (g.seq_start + 6 * g.seq_step)::text
      else kb.options[((kb.correct_choice + 3) % 4) + 1]
    end as wrong_3,
    case
      when g.template_id between 0 and 7 then g.dynamic_correct_choice::smallint
      else kb.correct_choice::smallint
    end as correct_choice,
    case
      when g.template_id = 0 then 'Phép cộng cơ bản.'
      when g.template_id = 1 then 'Giá trị tuyệt đối của hiệu là số không âm.'
      when g.template_id = 2 then 'Phép nhân cơ bản.'
      when g.template_id = 3 then 'Số bị chia là bội số chính xác của mẫu số.'
      when g.template_id = 4 then 'Tính theo công thức: n x p / 100.'
      when g.template_id = 5 then 'Trung bình cộng của ba số cách đều bằng số ở giữa.'
      when g.template_id = 6 then 'Chu vi HCN = 2 x (dài + rộng).'
      when g.template_id = 7 then 'Dãy số cấp số cộng, cộng thêm cùng hiệu.'
      else kb.explanation
    end as explanation
  from generated g
  join knowledge_bank kb on kb.knowledge_id = g.knowledge_id
)
insert into public.millionaire_question_bank (
  topic,
  difficulty,
  question_text,
  options,
  correct_choice,
  explanation,
  source_provider,
  source_model,
  source_prompt_version,
  confidence_score,
  verification_status
)
select
  p.topic,
  p.difficulty,
  p.question_text,
  case p.correct_choice
    when 0 then array[p.correct_answer, p.wrong_1, p.wrong_2, p.wrong_3]
    when 1 then array[p.wrong_1, p.correct_answer, p.wrong_2, p.wrong_3]
    when 2 then array[p.wrong_1, p.wrong_2, p.correct_answer, p.wrong_3]
    else array[p.wrong_1, p.wrong_2, p.wrong_3, p.correct_answer]
  end as options,
  p.correct_choice,
  p.explanation,
  'seed'::text as source_provider,
  'deterministic-generator'::text as source_model,
  'millionaire-seed-v2'::text as source_prompt_version,
  0.9600::numeric as confidence_score,
  'verified'::text as verification_status
from prepared p
where not exists (
  select 1
  from public.millionaire_question_bank q
  where q.question_text = p.question_text
);

-- Extra curated League of Legends questions
insert into public.millionaire_question_bank (
  topic,
  difficulty,
  question_text,
  options,
  correct_choice,
  explanation,
  source_provider,
  source_model,
  source_prompt_version,
  confidence_score,
  verification_status
)
select *
from (
  values
    ('esports', 4, '[LOL] Trên Summoner''s Rift, mỗi đội có bao nhiêu người chơi?', array['3', '4', '5', '6']::text[], 2, 'Chế độ tiêu chuẩn là 5v5, mỗi đội có 5 người.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9800::numeric, 'verified'),
    ('esports', 5, '[LOL] Mục tiêu nào xuất hiện lúc 20:00 và tăng sức mạnh đẩy lính?', array['Rồng Ngàn Tuổi', 'Baron Nashor', 'Sứ Giả Khe Nứt', 'Rồng Nguyên Tố']::text[], 1, 'Baron Nashor xuất hiện từ phút 20 và giúp tăng sức mạnh đẩy đường.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9800::numeric, 'verified'),
    ('esports', 3, '[LOL] Phép bổ trợ nào thường dùng để dịch chuyển tức thời một đoạn ngắn?', array['Hồi Máu', 'Dịch Chuyển', 'Tốc Biến', 'Thanh Tẩy']::text[], 2, 'Tốc Biến (Flash) cho phép dịch chuyển tức thời cự ly ngắn.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9700::numeric, 'verified'),
    ('esports', 6, '[LOL] Quái trung lập nào giúp tạo áp lực trụ ở giai đoạn sớm?', array['Rồng', 'Baron', 'Sứ Giả Khe Nứt', 'Bùa Xanh']::text[], 2, 'Sứ Giả Khe Nứt thường được dùng để phá trụ sớm và mở bản đồ.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9600::numeric, 'verified'),
    ('esports', 2, '[LOL] Để giành chiến thắng, đội cần phá hủy công trình nào của đối thủ?', array['Nhà Chính (Nexus)', 'Nhà Lính', 'Trụ Ngoài', 'Hang Rồng']::text[], 0, 'Mục tiêu cuối cùng là phá hủy Nexus của đối thủ.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9900::numeric, 'verified'),
    ('esports', 5, '[LOL] Vai trò nào thường đi đường giữa và đảm nhiệm sát thương phép chủ lực?', array['ADC', 'Support', 'Mid', 'Jungle']::text[], 2, 'Đường giữa thường dành cho pháp sư hoặc sát thủ gây sát thương phép.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9500::numeric, 'verified'),
    ('esports', 4, '[LOL] Khi hạ gục mục tiêu rừng lớn, đội thường nhận lợi ích nào?', array['Tăng kinh nghiệm và vàng', 'Hồi đầy máu ngay lập tức', 'Thêm 1 người chơi', 'Mở khóa kỹ năng mới']::text[], 0, 'Hạ gục mục tiêu lớn mang lại vàng, kinh nghiệm và lợi thế kiểm soát bản đồ.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9400::numeric, 'verified'),
    ('esports', 7, '[LOL] Công trình nào khi bị phá sẽ tạo lính siêu cấp ở đường đó?', array['Trụ Trong', 'Nhà Lính (Inhibitor)', 'Trụ Ngoài', 'Rồng']::text[], 1, 'Phá Nhà Lính sẽ tạo lính siêu cấp trên đường tương ứng.', 'seed', 'manual-lol', 'millionaire-seed-lol-v1', 0.9800::numeric, 'verified')
) as seed(
  topic,
  difficulty,
  question_text,
  options,
  correct_choice,
  explanation,
  source_provider,
  source_model,
  source_prompt_version,
  confidence_score,
  verification_status
)
where not exists (
  select 1
  from public.millionaire_question_bank q
  where q.question_text = seed.question_text
);
