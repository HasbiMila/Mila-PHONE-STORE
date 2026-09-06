const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("mila-phone-store.db");
db.pragma("journal_mode = WAL");

fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER,
  discount INTEGER DEFAULT 0,
  rating REAL DEFAULT 5,
  stock INTEGER NOT NULL DEFAULT 0,
  ram TEXT DEFAULT '',
  storage TEXT DEFAULT '',
  condition TEXT DEFAULT 'Baru',
  colors TEXT DEFAULT '',
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  items_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'Baru',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  image TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);
`);

const seedAdmin = db.prepare("SELECT id FROM admins LIMIT 1").get();
if (!seedAdmin) {
  const email = process.env.ADMIN_EMAIL || "admin@milaphone.store";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
  db.prepare("INSERT INTO admins (email,password_hash) VALUES (?,?)")
    .run(email, bcrypt.hashSync(password, 12));
}

const defaultSettings = {
  store_name: process.env.STORE_NAME || "MILA PHONE STORE",
  whatsapp: process.env.WHATSAPP_NUMBER || "6281234567890",
  address: "Jakarta, Indonesia",
  hours: "09.00 - 21.00",
  instagram: "",
  payment_methods: "Transfer Bank, QRIS, COD",
  hero_title: "Smartphone Premium, Harga Bersahabat",
  hero_subtitle: "Temukan HP impian dengan stok terupdate dan checkout cepat via WhatsApp."
};
const setSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)");
for (const [k,v] of Object.entries(defaultSettings)) setSetting.run(k, v);

const count = db.prepare("SELECT COUNT(*) c FROM products").get().c;
if (!count) {
  const seed = [
    ["iPhone 15 128GB","Apple","APL-IP15-128",12999000,11999000,8,4.9,8,"6GB","128GB","Baru","Black,Blue,Pink","https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=900&q=80","iPhone generasi terbaru dengan performa kencang dan kamera tajam.","A16 Bionic|OLED|48MP|USB-C"],
    ["Galaxy S24 256GB","Samsung","SAM-S24-256",13999000,12999000,7,4.8,10,"8GB","256GB","Baru","Black,Gray,Violet","https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=80","Flagship Samsung dengan layar Dynamic AMOLED.","Snapdragon|AMOLED 120Hz|50MP|5G"],
    ["Xiaomi 14T 256GB","Xiaomi","XIA-14T-256",6999000,6499000,7,4.7,15,"12GB","256GB","Baru","Black,Blue","https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80","Performa tinggi untuk gaming dan multitasking.","12GB RAM|144Hz|50MP|5G"],
    ["Reno 12 5G","OPPO","OPP-R12-256",5999000,5599000,7,4.7,12,"12GB","256GB","Baru","Black,Silver","https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=80","Desain tipis dengan kamera portrait yang memukau.","AMOLED|50MP|5G|67W"],
    ["vivo V40 5G","vivo","VIV-V40-256",6499000,6199000,5,4.8,9,"12GB","256GB","Baru","Purple,Black","https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=80","Smartphone stylish dengan kamera ZEISS.","AMOLED|ZEISS|80W|5G"],
    ["realme 13 Pro+","realme","RLM-13P-512",6999000,6599000,6,4.7,14,"12GB","512GB","Baru","Gold,Green","https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80","Storage besar dan kamera flagship class.","512GB|120Hz|50MP|5G"]
  ];
  const ins=db.prepare(`INSERT INTO products
  (name,brand,sku,price,sale_price,discount,rating,stock,ram,storage,condition,colors,image,description,specs)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const tx=db.transaction(rows=>rows.forEach(r=>ins.run(...r))); tx(seed);
}

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "replace-me-in-production",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*8}
}));
app.use("/uploads", express.static(path.join(__dirname,"uploads")));
app.use(express.static(path.join(__dirname,"public")));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb)=>cb(null,path.join(__dirname,"uploads")),
    filename: (_,file,cb)=>cb(null,Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
  }),
  limits:{fileSize:5*1024*1024},
  fileFilter: (_,file,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(file.mimetype))
});

function admin(req,res,next){ if(req.session.admin) return next(); res.status(401).json({error:"Unauthorized"}); }
function settings(){ return Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value])); }
function productPublic(p){ return {...p, active:!!p.active, colors:p.colors? p.colors.split(",").map(x=>x.trim()).filter(Boolean):[], specs:p.specs? p.specs.split("|").map(x=>x.trim()).filter(Boolean):[]}; }

app.get("/api/settings",(req,res)=>res.json(settings()));
app.get("/api/products",(req,res)=>{
  const {q="",brand="",min="",max="",ram="",storage="",condition=""}=req.query;
  let sql="SELECT * FROM products WHERE active=1"; const a=[];
  if(q){sql+=" AND (name LIKE ? OR brand LIKE ? OR sku LIKE ?)"; const x=`%${q}%`; a.push(x,x,x);}
  if(brand){sql+=" AND brand=?";a.push(brand)}
  if(min){sql+=" AND COALESCE(sale_price,price)>=?";a.push(Number(min))}
  if(max){sql+=" AND COALESCE(sale_price,price)<=?";a.push(Number(max))}
  if(ram){sql+=" AND ram=?";a.push(ram)}
  if(storage){sql+=" AND storage=?";a.push(storage)}
  if(condition){sql+=" AND condition=?";a.push(condition)}
  sql+=" ORDER BY id DESC";
  res.json(db.prepare(sql).all(...a).map(productPublic));
});
app.get("/api/products/:id",(req,res)=>{
  const p=db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(req.params.id);
  if(!p)return res.status(404).json({error:"Product not found"}); res.json(productPublic(p));
});
app.post("/api/orders",(req,res)=>{
  const {customer_name,phone,address,items}=req.body;
  if(!customer_name||!phone||!Array.isArray(items)||!items.length)return res.status(400).json({error:"Data checkout tidak lengkap"});
  const ids=items.map(x=>Number(x.id)); const placeholders=ids.map(()=>"?").join(",");
  const products=db.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND active=1`).all(...ids);
  const map=new Map(products.map(p=>[p.id,p]));
  let total=0;
  for(const item of items){
    const p=map.get(Number(item.id)); const qty=Math.max(1,Number(item.qty)||1);
    if(!p||p.stock<qty)return res.status(409).json({error:`Stok tidak cukup untuk ${p?.name||"produk"}`});
    total += (p.sale_price||p.price)*qty;
  }
  const tx=db.transaction(()=>{
    for(const item of items) db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(Math.max(1,Number(item.qty)||1),Number(item.id));
    return db.prepare("INSERT INTO orders(customer_name,phone,address,items_json,total) VALUES(?,?,?,?,?)")
      .run(customer_name,phone,address||"",JSON.stringify(items),total).lastInsertRowid;
  });
  const orderId=tx();
  res.json({order_id:orderId,total,whatsapp:settings().whatsapp});
});

app.post("/api/admin/login",(req,res)=>{
  const {email,password}=req.body; const a=db.prepare("SELECT * FROM admins WHERE email=?").get(email||"");
  if(!a||!bcrypt.compareSync(password||"",a.password_hash))return res.status(401).json({error:"Email atau password salah"});
  req.session.admin={id:a.id,email:a.email}; res.json({ok:true,email:a.email});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({authenticated:!!req.session.admin,email:req.session.admin?.email||null}));

app.get("/api/admin/products",admin,(req,res)=>res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all().map(productPublic)));
app.post("/api/admin/products",admin,(req,res)=>{
  const p=req.body;
  try{
    const r=db.prepare(`INSERT INTO products(name,brand,sku,price,sale_price,discount,rating,stock,ram,storage,condition,colors,image,description,specs,active)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name,p.brand,p.sku,Number(p.price),p.sale_price?Number(p.sale_price):null,Number(p.discount)||0,Number(p.rating)||5,Number(p.stock)||0,p.ram||"",p.storage||"",p.condition||"Baru",Array.isArray(p.colors)?p.colors.join(","):p.colors||"",p.image||"",p.description||"",Array.isArray(p.specs)?p.specs.join("|"):p.specs||"",p.active===false?0:1);
    res.json({id:r.lastInsertRowid});
  }catch(e){res.status(400).json({error:e.message})}
});
app.put("/api/admin/products/:id",admin,(req,res)=>{
  const p=req.body;
  try{
    db.prepare(`UPDATE products SET name=?,brand=?,sku=?,price=?,sale_price=?,discount=?,rating=?,stock=?,ram=?,storage=?,condition=?,colors=?,image=?,description=?,specs=?,active=? WHERE id=?`)
    .run(p.name,p.brand,p.sku,Number(p.price),p.sale_price?Number(p.sale_price):null,Number(p.discount)||0,Number(p.rating)||5,Number(p.stock)||0,p.ram||"",p.storage||"",p.condition||"Baru",Array.isArray(p.colors)?p.colors.join(","):p.colors||"",p.image||"",p.description||"",Array.isArray(p.specs)?p.specs.join("|"):p.specs||"",p.active===false?0:1,req.params.id);
    res.json({ok:true});
  }catch(e){res.status(400).json({error:e.message})}
});
app.delete("/api/admin/products/:id",admin,(req,res)=>{db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);res.json({ok:true})});
app.post("/api/admin/upload",admin,upload.single("image"),(req,res)=>{if(!req.file)return res.status(400).json({error:"File gambar tidak valid"});res.json({url:"/uploads/"+req.file.filename})});

app.get("/api/admin/orders",admin,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all()));
app.patch("/api/admin/orders/:id",admin,(req,res)=>{
  const allowed=["Baru","Diproses","Dikirim","Selesai","Dibatalkan"];
  if(!allowed.includes(req.body.status))return res.status(400).json({error:"Status tidak valid"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);res.json({ok:true});
});
app.get("/api/admin/stats",admin,(req,res)=>{
  const revenue=db.prepare("SELECT COALESCE(SUM(total),0) x FROM orders WHERE status!='Dibatalkan'").get().x;
  const orders=db.prepare("SELECT COUNT(*) x FROM orders").get().x;
  const sold=db.prepare(`SELECT COALESCE(SUM(CAST(json_extract(value,'$.qty') AS INTEGER)),0) x FROM orders, json_each(orders.items_json) WHERE orders.status!='Dibatalkan'`).get().x;
  const low=db.prepare("SELECT COUNT(*) x FROM products WHERE stock<=3 AND active=1").get().x;
  res.json({revenue,orders,sold,low_stock:low});
});
app.put("/api/admin/settings",admin,(req,res)=>{
  const up=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const tx=db.transaction(obj=>Object.entries(obj).forEach(([k,v])=>up.run(k,String(v))));
  tx(req.body);res.json(settings());
});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public/admin.html")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MILA PHONE STORE running on port ${PORT}`);
});
