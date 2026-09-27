// 商品データ。商品の追加・価格変更はこのファイルを編集してください。
const PRODUCTS = [
  {
    id: "basic-white",
    name: "ベーシックTシャツ ホワイト",
    category: "basic",
    price: 3300,
    color: "#f5f5f5",
    print: "",
    sizes: ["S", "M", "L", "XL"],
    description: "毎日使える定番の白T。厚手5.6ozコットンで透けにくい仕上がり。"
  },
  {
    id: "basic-black",
    name: "ベーシックTシャツ ブラック",
    category: "basic",
    price: 3300,
    color: "#222222",
    print: "",
    sizes: ["S", "M", "L", "XL"],
    description: "どんなスタイルにも合わせやすいブラック。洗濯しても色あせしにくい素材です。"
  },
  {
    id: "basic-navy",
    name: "ベーシックTシャツ ネイビー",
    category: "basic",
    price: 3300,
    color: "#1f2a44",
    print: "",
    sizes: ["S", "M", "L", "XL"],
    description: "落ち着いたネイビーカラー。きれいめコーデにもおすすめ。"
  },
  {
    id: "graphic-logo",
    name: "ロゴプリントTシャツ",
    category: "graphic",
    price: 4400,
    color: "#ffffff",
    print: "LOGO",
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "胸元にショップロゴをプリント。シンプルながら存在感のある一枚。"
  },
  {
    id: "graphic-sun",
    name: "サンセットグラフィックTシャツ",
    category: "graphic",
    price: 4950,
    color: "#f2e6d0",
    print: "SUN",
    sizes: ["S", "M", "L", "XL"],
    description: "夕焼けをイメージしたグラフィック。サンドベージュのボディに映えるデザイン。"
  },
  {
    id: "limited-opening",
    name: "【オープン記念】限定Tシャツ",
    category: "limited",
    price: 5500,
    color: "#c8102e",
    print: "OPEN",
    sizes: ["M", "L", "XL"],
    description: "オンラインショップ開設を記念した数量限定モデル。なくなり次第終了です。"
  }
];

const CATEGORY_LABELS = {
  basic: "ベーシック",
  graphic: "グラフィック",
  limited: "限定"
};
