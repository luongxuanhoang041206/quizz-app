# Live Quiz Frontend Hand-off Document

Tài liệu này mô tả đúng flow API hiện tại của backend cho module Live Quiz, phục vụ cho Frontend implement mà không cần đọc source Backend.

> Ghi chú quan trọng:
> - Tất cả endpoint đều có prefix /api.
> - Backend dùng JWT Bearer token để xác thực user.
> - Route param sessionId được truyền trong URL.
> - Backend hiện tại không trả các field camelCase như `txHash`, `policyId`, `assetName`, `ipfsCid` trong response của claim API; các field này chỉ được lưu trong DB hoặc dùng internal service.

---

## Endpoint

```
POST /api/sessions/:sessionId/submit
```

### Mục đích

Frontend gọi API này mỗi khi user trả lời 1 câu hỏi trong Live Quiz.

Backend sẽ:
- kiểm tra session còn đang ở trạng thái playing,
- kiểm tra user đã tham gia session,
- kiểm tra câu hỏi chưa được trả lời trước đó,
- chấm điểm câu hỏi,
- lưu câu trả lời vào session_answers,
- cập nhật điểm vào leaderboard,
- trả về kết quả câu hỏi hiện tại và trạng thái đã hoàn thành quiz chưa.

### Khi nào Frontend gọi API này

- User đã vào session live quiz và đang làm bài.
- Mỗi lần user submit 1 câu trả lời.
- Frontend nên gọi sau khi user bấm Submit / Next / Confirm answer.

### Request

```
{
  "question_id": "string",
  "answer": "any",
  "time_taken": 12
}
```

Giải thích từng field:
- `question_id` (string, bắt buộc): ID của câu hỏi mà user đang trả lời.
- `answer` (any, bắt buộc): Câu trả lời user submit. Dạng có thể là:
  - index số cho single choice,
  - array/object cho multiple choice,
  - boolean/string/object tùy loại câu hỏi.
- `time_taken` (number, bắt buộc): Thời gian user dùng để trả lời câu hỏi, đơn vị giây.

> Backend dùng `time_taken` để tính điểm theo logic chấm câu hỏi. Nếu câu trả lời đúng, điểm có thể phụ thuộc vào thời gian trả lời.

### Response thành công

```
{
  "is_correct": true,
  "score_gained": 850,
  "total_score": 2550,
  "finished": false
}
```

Giải thích từng field:
- `is_correct` (boolean): Kết quả câu trả lời đúng/sai.
- `score_gained` (number): Điểm mà câu hỏi này mang lại cho user.
- `total_score` (number): Tổng điểm hiện tại của user trong session sau khi cộng điểm câu vừa submit.
- `finished` (boolean): Cho biết user đã hoàn thành toàn bộ câu hỏi của quiz trong session hay chưa theo logic backend hiện tại.

### Response lỗi

Backend có thể trả các lỗi sau:
- `401 Unauthorized`: chưa đăng nhập hoặc token không hợp lệ.
- `404 Not Found`: session không tồn tại.
- `400 Bad Request`: session chưa bắt đầu hoặc đã kết thúc.
- `400 Bad Request`: user chưa tham gia session này.
- `400 Bad Request`: user đã trả lời câu hỏi này rồi.
- `404 Not Found`: câu hỏi không tồn tại.
- `400 Bad Request`: câu hỏi không thuộc session này.
- `400 Bad Request`: không thể lưu câu trả lời session.
- `400 Bad Request`: không thể cập nhật điểm.

---

## Endpoint

```
POST /api/sessions/:sessionId/finish
```

### Mục đích

Frontend gọi API này khi user đã hoàn tất tất cả câu hỏi và muốn kết thúc Live Quiz.

Backend sẽ:
- kiểm tra người dùng đã trả lời đủ số câu hỏi của quiz hay chưa,
- tính điểm cuối cùng,
- tính phần trăm điểm,
- kiểm tra điều kiện đủ điều kiện nhận NFT,
- tạo record achievement ở trạng thái PENDING nếu đủ điều kiện và có reward,
- trả về thông tin kết thúc quiz.

### Khi nào Frontend gọi API này

- Sau khi user hoàn thành câu hỏi cuối cùng.
- Sau khi frontend xác nhận user đã submit toàn bộ câu hỏi.
- Đây là API dùng để “submit kết thúc quiz” thay vì tiếp tục làm bài.

### Request

```
{}
```

Giải thích từng field:
- Không có body request.
- Frontend chỉ cần truyền `sessionId` trong URL và token JWT trong header.

### Response thành công

```
{
  "finished": true,
  "total_score": 2500,
  "max_score": 5000,
  "percentage": 50,
  "nft_eligible": false,
  "achievement_id": null
}
```

Giải thích từng field:
- `finished` (boolean): Trạng thái đã kết thúc quiz. Trong response này, backend trả về `true` khi finish thành công.
- `total_score` (number): Tổng điểm cuối cùng của user trong session.
- `max_score` (number): Điểm tối đa có thể đạt cho quiz, tính bằng số câu hỏi × 1000.
- `percentage` (number): Tỷ lệ điểm cuối cùng so với điểm tối đa, tính theo công thức:
  - `percentage = (total_score / max_score) * 100`
  - Backend làm tròn 2 chữ số thập phân.
- `nft_eligible` (boolean): Cho biết user có đủ điều kiện nhận NFT hay không. Điều kiện hiện tại là `percentage >= 80`.
- `achievement_id` (string hoặc null): ID của achievement record do backend tạo. Nếu user không đủ điều kiện nhận NFT hoặc không có reward thì giá trị là `null`.

### Response lỗi

Backend có thể trả các lỗi sau:
- `401 Unauthorized`: chưa đăng nhập hoặc token không hợp lệ.
- `404 Not Found`: session không tồn tại.
- `400 Bad Request`: user chưa hoàn thành tất cả câu hỏi.
- `400 Bad Request`: lỗi khi tạo achievement record hoặc lưu dữ liệu.

---

## Endpoint

```
POST /api/achievement/claim
```

### Mục đích

Frontend gọi API này khi user muốn claim NFT achievement sau khi quiz đã kết thúc và backend đã tạo achievement ở trạng thái PENDING.

Backend sẽ:
- kiểm tra achievement tồn tại và thuộc về user hiện tại,
- kiểm tra achievement đang ở trạng thái PENDING,
- kiểm tra user đã liên kết ví Cardano,
- kiểm tra reward tồn tại,
- build và submit transaction mint NFT trên Cardano,
- cập nhật achievement sang SUCCESS hoặc FAILED.

### Khi nào Frontend gọi API này

- Khi frontend đã nhận được `achievement_id` từ finish API.
- Khi `nft_eligible = true`.
- Khi user nhấn nút “Claim NFT”.

### Request

```
{
  "achievement_id": "string"
}
```

Giải thích từng field:
- `achievement_id` (string, bắt buộc): ID của achievement record đã được backend tạo ở bước finish.

### Response thành công

```
{
  "tx_hash": "string"
}
```

Giải thích từng field:
- `tx_hash` (string): Hash của transaction mint NFT đã được submit lên blockchain.

> Backend hiện tại trả về field `tx_hash` theo kiểu snake_case. Đây là response thực tế của API hiện tại.

### Response lỗi

Backend có thể trả các lỗi sau:
- `401 Unauthorized`: chưa đăng nhập hoặc token không hợp lệ.
- `404 Not Found`: achievement không tồn tại hoặc không thuộc user hiện tại.
- `400 Bad Request`: achievement không ở trạng thái PENDING.
- `400 Bad Request`: user chưa liên kết ví Cardano.
- `400 Bad Request`: reward không tồn tại.
- `500 Internal Server Error` hoặc lỗi từ Cardano service nếu mint NFT thất bại.

---

## Ý nghĩa các field quan trọng

### `finished`
- Là trạng thái “user đã hoàn thành toàn bộ quiz trong session hay chưa”.
- Trong submit API, backend trả về `finished` để frontend biết liệu câu hỏi vừa submit có phải là câu hỏi cuối cùng hay không.
- Trong finish API, backend trả về `true` khi kết thúc quiz thành công.

### `total_score`
- Là tổng điểm hiện tại của user trong session.
- Trong submit API, là tổng điểm sau khi cộng điểm của câu hỏi vừa trả lời.
- Trong finish API, là điểm cuối cùng của user sau khi kết thúc quiz.

### `percentage`
- Là tỷ lệ phần trăm điểm cuối cùng so với điểm tối đa.
- Backend tính theo `total_score / max_score * 100`.
- Đây là cơ sở để xác định `nft_eligible`.

### `rank`
- Đây là field dùng trong leaderboard, không phải response của 3 API trên.
- Backend trả `rank` qua endpoint leaderboard, ví dụ:
  - `GET /api/sessions/:sessionId/leaderboard`
- Ý nghĩa: vị trí xếp hạng của user trong bảng xếp hạng session hiện tại.

### `nft_eligible`
- Cho biết user có đủ điều kiện nhận NFT không.
- Điều kiện hiện tại là `percentage >= 80`.
- Nếu `false`, frontend không nên hiển thị nút claim NFT.

### `achievement_id`
- Là ID của achievement record do backend tạo khi finish API phát hiện user đủ điều kiện nhận NFT.
- Nếu `null`, frontend không thể gọi claim API.
- Nếu không null, frontend có thể hiển thị nút Claim NFT.

### `already_claimed`
- Trong implementation hiện tại, backend không trả field này trong response của các API này.
- Frontend không nên dựa vào field này để quyết định trạng thái claim trong phiên bản backend hiện tại.
- Thay vào đó, frontend nên dựa vào `achievement_id` và kết quả của claim API.

### `txHash`
- Đây là tên field camelCase thường dùng ở tầng frontend.
- Trong backend hiện tại, response thực tế trả về `tx_hash` (snake_case) cho claim API.
- Ý nghĩa: hash transaction mint NFT đã được submit lên blockchain.

### `policyId`
- Ý nghĩa: policy ID của NFT trên Cardano.
- Trong backend hiện tại, field này không được trả về cho frontend từ claim API.
- Backend có lưu field này trong bảng achievement khi claim thành công.

### `assetName`
- Ý nghĩa: tên asset NFT trên Cardano.
- Trong backend hiện tại, field này không được trả về cho frontend từ claim API.
- Backend có lưu field này trong bảng achievement khi claim thành công.

### `ipfsCid`
- Ý nghĩa: CID của metadata NFT trên IPFS.
- Trong backend hiện tại, field này không được trả về cho frontend từ claim API.
- Backend có dùng field này trong quá trình build metadata NFT, nhưng không expose ra response hiện tại.

---

# Live Quiz Flow

Sau đây là luồng hoàn chỉnh theo logic hiện tại của backend.

1. User vào Live Quiz
   - Frontend cần có sessionId và JWT token của user.
   - User đang ở màn hình Live Quiz và bắt đầu làm bài.

2. Submit từng câu hỏi
   - Mỗi lần user trả lời 1 câu, frontend gọi:
     - `POST /api/sessions/:sessionId/submit`
   - Backend kiểm tra session đang `playing`, user đã tham gia, câu hỏi chưa bị submit trước đó.
   - Backend chấm điểm câu hỏi và cập nhật điểm vào leaderboard.
   - Backend trả về `is_correct`, `score_gained`, `total_score`, `finished`.

3. Backend cập nhật leaderboard
   - Sau mỗi submit đúng/sai, backend sẽ cộng điểm vào bảng leaderboard của user trong session.
   - Đây là cơ sở để frontend hiển thị điểm đang tăng dần.

4. Khi câu cuối được submit
   - Backend sẽ đánh dấu `finished` theo logic hiện tại khi user đã trả lời đủ số câu hỏi của quiz trong session.
   - Frontend có thể dùng `finished` từ response để biết đây là câu hỏi cuối cùng.

5. Frontend gọi Finish
   - Khi user hoàn tất bài, frontend gọi:
     - `POST /api/sessions/:sessionId/finish`
   - Backend kiểm tra user đã trả lời đủ số câu hỏi.
   - Nếu chưa đủ, trả lỗi.

6. Backend tính điểm cuối
   - Backend tính `total_score`, `max_score`, `percentage`.
   - Nếu `percentage >= 80`, user được đánh dấu `nft_eligible = true`.

7. Backend tạo Achievement (PENDING) nếu đủ điều kiện
   - Nếu user đủ điều kiện và quiz có reward, backend sẽ tạo record achievement ở trạng thái `PENDING`.
   - Nếu không đủ điều kiện hoặc không có reward, `achievement_id` sẽ là `null`.

8. Backend trả achievement_id
   - Finish API trả về `achievement_id`.
   - Frontend dùng giá trị này để quyết định có hiển thị nút Claim NFT hay không.

9. Frontend hiển thị nút Claim NFT
   - Nếu `nft_eligible = true` và `achievement_id` không null, frontend nên hiển thị nút Claim NFT.
   - Nếu không, nút này không nên hiển thị.

10. User bấm Claim NFT
   - Frontend gọi:
     - `POST /api/achievement/claim`
   - Body truyền `achievement_id`.

11. Backend mint NFT
   - Backend kiểm tra achievement ở trạng thái PENDING, user có ví Cardano và reward tồn tại.
   - Nếu hợp lệ, backend build và submit transaction mint NFT trên Cardano.

12. Backend cập nhật Achievement thành CLAIMED
   - Trong implementation hiện tại, backend cập nhật achievement sang trạng thái `SUCCESS` sau khi mint thành công.
   - Nếu mint thất bại, backend cập nhật achievement sang trạng thái `FAILED`.
   - Frontend nên coi đây là trạng thái hoàn tất hoặc thất bại của claim.

13. Frontend hiển thị thành công
   - Nếu claim API thành công, frontend có thể hiện thông báo thành công và hiển thị transaction hash từ response.
   - Nếu claim thất bại, frontend cần hiển thị lỗi phù hợp và cho phép user thử lại sau.

---

# State machine

Frontend sẽ gặp các trạng thái sau đây trong quá trình Live Quiz.

## 1. Playing
- Trạng thái ban đầu khi user đang làm bài.
- Điều kiện vào: user đã vào session và session đang ở trạng thái `playing`.
- Chuyển tiếp: khi user submit một câu hỏi, trạng thái có thể chuyển sang `Answer Submitted`.

## 2. Answer Submitted
- Trạng thái sau mỗi lần submit câu hỏi thành công.
- Điều kiện vào: submit API trả về thành công.
- Chuyển tiếp:
  - Nếu vẫn còn câu hỏi chưa làm, quay lại `Playing`.
  - Nếu đây là câu hỏi cuối cùng theo logic backend, có thể chuyển sang `Quiz Finished` khi frontend gọi finish.

## 3. Quiz Finished
- Trạng thái khi user đã kết thúc quiz.
- Điều kiện vào: finish API thành công.
- Chuyển tiếp:
  - Nếu `nft_eligible = true` và `achievement_id != null`, chuyển sang `NFT Eligible` / `Achievement Pending`.
  - Nếu `nft_eligible = false`, chuyển sang `NFT Not Eligible`.

## 4. NFT Eligible
- Trạng thái khi quiz finished và user đủ điều kiện nhận NFT.
- Điều kiện vào: finish API trả về `nft_eligible = true`.
- Chuyển tiếp: khi frontend hiển thị nút claim và user bấm claim, chuyển sang `Claiming`.

## 5. NFT Not Eligible
- Trạng thái khi quiz finished nhưng không đủ điều kiện nhận NFT.
- Điều kiện vào: finish API trả về `nft_eligible = false`.
- Chuyển tiếp: không có claim tiếp theo.

## 6. Achievement Pending
- Trạng thái khi finish API tạo được achievement record ở trạng thái PENDING.
- Điều kiện vào: `achievement_id` không null.
- Chuyển tiếp: khi user bấm claim, chuyển sang `Claiming`.

## 7. Claiming
- Trạng thái đang thực hiện claim NFT.
- Điều kiện vào: frontend gọi claim API.
- Chuyển tiếp:
  - Nếu claim thành công, chuyển sang `Claimed`.
  - Nếu claim thất bại, chuyển sang `Claim Failed`.

## 8. Claimed
- Trạng thái claim NFT thành công.
- Điều kiện vào: claim API trả về success.
- Chuyển tiếp: frontend có thể hiển thị thông báo thành công và tx hash.

## 9. Claim Failed
- Trạng thái claim NFT thất bại.
- Điều kiện vào: claim API ném lỗi hoặc backend cập nhật achievement thành FAILED.
- Chuyển tiếp: frontend có thể cho user thử lại sau.

---

## Tóm tắt triển khai cho Frontend

- Luôn gửi JWT Bearer token trong header.
- Luôn gửi `sessionId` trong URL.
- `submit` API dùng cho từng câu hỏi.
- `finish` API dùng khi user kết thúc quiz.
- Nếu finish API trả về `nft_eligible = true` và `achievement_id != null`, mới hiển thị nút Claim NFT.
- Claim NFT chỉ gọi khi user bấm nút claim.
- `tx_hash` là response thành công của claim API trong implementation hiện tại.

Nếu cần, frontend có thể dùng thêm endpoint leaderboard để hiển thị bảng xếp hạng và `rank` của user. Đây là API bổ sung liên quan đến Live Quiz nhưng không nằm trong yêu cầu chính của tài liệu này.
