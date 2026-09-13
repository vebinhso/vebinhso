/** Tra cứu nhà mạng & vùng của số điện thoại Việt Nam (dữ liệu tĩnh, không gọi mạng) */

export type PhoneLookup = {
  input: string;
  normalized: string;
  e164: string;
  valid: boolean;
  kind: "mobile" | "landline" | "service" | "international" | "unknown";
  carrier: string;
  province: string;
  note: string;
};

const MOBILE: Record<string, string> = {};
const add = (list: string[], name: string) => list.forEach((p) => (MOBILE[p] = name));
add(["032", "033", "034", "035", "036", "037", "038", "039", "086", "096", "097", "098"], "Viettel");
add(["070", "076", "077", "078", "079", "089", "090", "093"], "MobiFone");
add(["081", "082", "083", "084", "085", "088", "091", "094"], "VinaPhone");
add(["056", "058", "092"], "Vietnamobile");
add(["059", "099"], "Gmobile");
add(["087"], "iTel (hạ tầng VinaPhone)");
add(["055"], "Reddi / Wintel (hạ tầng MobiFone)");
add(["052"], "Vietnamobile / VNSKY");

/** Mã vùng điện thoại cố định */
const AREA: Record<string, string> = {
  "024": "Hà Nội",
  "028": "TP. Hồ Chí Minh",
  "0225": "Hải Phòng",
  "0236": "Đà Nẵng",
  "0292": "Cần Thơ",
  "0203": "Quảng Ninh",
  "0204": "Bắc Giang",
  "0205": "Lạng Sơn",
  "0206": "Cao Bằng",
  "0207": "Tuyên Quang",
  "0208": "Thái Nguyên",
  "0209": "Bắc Kạn",
  "0210": "Phú Thọ",
  "0211": "Vĩnh Phúc",
  "0212": "Sơn La",
  "0213": "Lai Châu",
  "0214": "Lào Cai",
  "0215": "Điện Biên",
  "0216": "Yên Bái",
  "0218": "Hoà Bình",
  "0219": "Hà Giang",
  "0220": "Hải Dương",
  "0221": "Hưng Yên",
  "0222": "Bắc Ninh",
  "0226": "Hà Nam",
  "0227": "Thái Bình",
  "0228": "Nam Định",
  "0229": "Ninh Bình",
  "0232": "Quảng Bình",
  "0233": "Quảng Trị",
  "0234": "Thừa Thiên Huế",
  "0235": "Quảng Nam",
  "0237": "Thanh Hoá",
  "0238": "Nghệ An",
  "0239": "Hà Tĩnh",
  "0251": "Đồng Nai",
  "0252": "Bình Thuận",
  "0254": "Bà Rịa - Vũng Tàu",
  "0255": "Quảng Ngãi",
  "0256": "Bình Định",
  "0257": "Phú Yên",
  "0258": "Khánh Hoà",
  "0259": "Ninh Thuận",
  "0260": "Kon Tum",
  "0261": "Đắk Nông",
  "0262": "Đắk Lắk",
  "0263": "Lâm Đồng",
  "0269": "Gia Lai",
  "0270": "Vĩnh Long",
  "0271": "Bình Phước",
  "0272": "Long An",
  "0273": "Tiền Giang",
  "0274": "Bình Dương",
  "0275": "Bến Tre",
  "0276": "Tây Ninh",
  "0277": "Đồng Tháp",
  "0290": "Cà Mau",
  "0291": "Bạc Liêu",
  "0293": "Hậu Giang",
  "0294": "Trà Vinh",
  "0296": "An Giang",
  "0297": "Kiên Giang",
  "0299": "Sóc Trăng",
};

const COUNTRY: Record<string, string> = {
  "1": "Mỹ / Canada",
  "44": "Anh",
  "61": "Úc",
  "62": "Indonesia",
  "63": "Philippines",
  "65": "Singapore",
  "66": "Thái Lan",
  "81": "Nhật Bản",
  "82": "Hàn Quốc",
  "84": "Việt Nam",
  "85": "Đông Nam Á",
  "855": "Campuchia",
  "856": "Lào",
  "86": "Trung Quốc",
  "234": "Nigeria",
  "233": "Ghana",
  "374": "Armenia",
  "375": "Belarus",
  "381": "Serbia",
  "call": "",
};

export function lookupPhone(raw: string): PhoneLookup {
  const input = String(raw || "").trim();
  let d = input.replace(/[^\d+]/g, "");
  const plus = d.startsWith("+");
  d = d.replace(/\+/g, "");

  // Chuẩn hoá về dạng 0xxxxxxxxx nếu là số Việt Nam
  let local = d;
  if (d.startsWith("84") && (plus || d.length >= 11)) local = "0" + d.slice(2);
  else if (d.startsWith("0084")) local = "0" + d.slice(4);

  const isVN = local.startsWith("0") && local.length >= 10 && local.length <= 11;

  if (!isVN) {
    let cc = "";
    for (const len of [3, 2, 1]) {
      const k = d.slice(0, len);
      if (COUNTRY[k]) {
        cc = k;
        break;
      }
    }
    return {
      input,
      normalized: d,
      e164: plus ? "+" + d : d,
      valid: d.length >= 7,
      kind: cc && cc !== "84" ? "international" : "unknown",
      carrier: "Không xác định",
      province: cc && cc !== "84" ? (COUNTRY[cc] ?? "Nước ngoài") : "Không xác định",
      note: cc && cc !== "84" ? `Số gọi từ nước ngoài (mã quốc gia +${cc}).` : "Không nhận dạng được định dạng số.",
    };
  }

  const e164 = "+84" + local.slice(1);

  // Đầu số dịch vụ / tổng đài
  if (/^1[89]/.test(local.slice(1)) || local.startsWith("01900") || local.startsWith("1900")) {
    return {
      input,
      normalized: local,
      e164,
      valid: true,
      kind: "service",
      carrier: "Đầu số dịch vụ (1900/1800)",
      province: "Toàn quốc",
      note: "Đầu số dịch vụ: 1800 miễn phí, 1900 tính phí cao.",
    };
  }

  const p3 = local.slice(0, 3);
  if (local.length === 10 && MOBILE[p3]) {
    return {
      input,
      normalized: local,
      e164,
      valid: true,
      kind: "mobile",
      carrier: MOBILE[p3]!,
      province: "Không cố định (số di động)",
      note: "Số di động Việt Nam không gắn với tỉnh/thành; chỉ xác định được nhà mạng.",
    };
  }

  for (const len of [4, 3]) {
    const code = local.slice(0, len);
    if (AREA[code]) {
      return {
        input,
        normalized: local,
        e164,
        valid: local.length === 10 || local.length === 11,
        kind: "landline",
        carrier: "Điện thoại cố định (VNPT/Viettel/FPT...)",
        province: AREA[code]!,
        note: `Mã vùng ${code} — ${AREA[code]}.`,
      };
    }
  }

  return {
    input,
    normalized: local,
    e164,
    valid: false,
    kind: "unknown",
    carrier: "Không xác định",
    province: "Không xác định",
    note: "Đầu số không khớp danh sách nhà mạng hoặc mã vùng hợp lệ của Việt Nam.",
  };
}
