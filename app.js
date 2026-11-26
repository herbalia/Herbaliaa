const DEFAULT_PRODUCTS = [
 {id:"p1",name:"روغن بست‌کیور",category:"روغن‌های گیاهی",price:444000,description:"فرآورده روغنی؛ برای مشاهده ترکیبات و شیوه مصرف، توضیحات محصول را بررسی کنید.",image:""},
 {id:"p2",name:"محصولات نازله",category:"مراقبت و سلامت",price:400000,description:"بسته ۳۰ عددی؛ اطلاعات تکمیلی و ترکیبات را پیش از خرید بررسی کنید.",image:""},
 {id:"p3",name:"چوب صندل",category:"گیاهان و فرآورده‌ها",price:null,description:"محصول گیاهی؛ قیمت و موجودی را از هربالیا استعلام کنید.",image:""},
 {id:"p4",name:"جاوی",category:"گیاهان و فرآورده‌ها",price:null,description:"در رنگ‌بندی‌های مختلف؛ برای اطلاع از موجودی پیام دهید.",image:""}
];
const money = n => n == null ? "استعلام قیمت" : new Intl.NumberFormat("fa-IR").format(n)+" تومان";
let products = DEFAULT_PRODUCTS;
let cart = JSON.parse(localStorage.getItem("herbalia_cart") || "[]");
let activeCategory = "همه";
const $ = id => document.getElementById(id);
function save(){localStorage.setItem("herbalia_products",JSON.stringify(products));localStorage.setItem("herbalia_cart",JSON.stringify(cart));}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400);}
function renderProducts(){
 const list=activeCategory==="همه"?products:products.filter(p=>p.category===activeCategory);
 $("productGrid").innerHTML=list.map(p=>`<article class="product-card"><div class="product-image">${p.image?`<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`:`<div class="product-placeholder">${escapeHtml(p.name)}</div>`}<span class="product-tag">${escapeHtml(p.category)}</span></div><div class="product-info"><small>HERBALIA BOTANICAL SELECTION</small><h3>${escapeHtml(p.name)}</h3><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.id}">افزودن +</button></div></div></article>`).join("") || "<p>محصولی در این دسته ثبت نشده است.</p>";
 document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)));
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function addToCart(id){let item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});save();renderCart();toast("به سبد خرید اضافه شد");}
function renderCart(){
 $("cartCount").textContent=new Intl.NumberFormat("fa-IR").format(cart.reduce((s,x)=>s+x.qty,0));
 $("cartItems").innerHTML=cart.length?cart.map(x=>{let p=products.find(y=>y.id===x.id);if(!p)return "";return `<div class="cart-line"><div class="cart-thumb">✧</div><div><h4>${escapeHtml(p.name)}</h4><small>${money(p.price)}</small><div class="qty"><button data-qty="${p.id}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-delta="1">+</button></div></div><button class="remove-line" data-remove="${p.id}">×</button></div>`}).join(""):"<p style='font-size:12px;color:#858d7d;text-align:center;padding:45px 0'>سبد خرید شما خالی است.</p>";
 let total=cart.reduce((s,x)=>{let p=products.find(y=>y.id===x.id);return s+(p?.price||0)*x.qty},0);
 $("cartTotal").textContent=money(total);
 document.querySelectorAll("[data-qty]").forEach(b=>b.onclick=()=>{let item=cart.find(x=>x.id===b.dataset.qty);item.qty+=Number(b.dataset.delta);if(item.qty<1)cart=cart.filter(x=>x.id!==b.dataset.qty);save();renderCart();});
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart=cart.filter(x=>x.id!==b.dataset.remove);save();renderCart();});
}
function openCart(){ $("cartDrawer").classList.add("open");$("drawerBackdrop").classList.add("show");}
function closeCart(){ $("cartDrawer").classList.remove("open");$("drawerBackdrop").classList.remove("show");}
$("cartOpen").onclick=openCart;$("cartClose").onclick=closeCart;$("drawerBackdrop").onclick=closeCart;
$("categoryFilters").addEventListener("click",e=>{let b=e.target.closest("[data-category]");if(!b)return;activeCategory=b.dataset.category;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderProducts();});
$("checkoutBtn").onclick=()=>{if(!cart.length){toast("سبد خرید خالی است");return;}let lines=cart.map(x=>{let p=products.find(y=>y.id===x.id);return `${p.name} × ${x.qty} — ${money(p.price)}`}).join("\n");let total=cart.reduce((s,x)=>s+(products.find(y=>y.id===x.id)?.price||0)*x.qty,0);let msg=`سلام هربالیا، برای ثبت سفارش راهنمایی می‌خواهم:\n${lines}\nجمع اقلام دارای قیمت: ${money(total)}\nلطفاً هزینه ارسال و نحوه پرداخت را اعلام کنید.`;window.open("https://ble.ir/herbalia_organic","_blank");navigator.clipboard?.writeText(msg).then(()=>toast("جزئیات سفارش کپی شد؛ آن را در گفت‌وگوی هربالیا ارسال کنید")).catch(()=>toast("لطفاً جزئیات سبد را به هربالیا اعلام کنید"));};
$("adminOpen").onclick=()=>{$("adminBackdrop").classList.add("show");};$("adminClose").onclick=()=>{$("adminBackdrop").classList.remove("show");};$("adminBackdrop").addEventListener("click",e=>{if(e.target===$("adminBackdrop"))$("adminBackdrop").classList.remove("show")});

function renderAdmin(){$("adminProducts").innerHTML=products.map(p=>`<div class="admin-product"><div><b>${escapeHtml(p.name)}</b><br><span>${money(p.price)} · ${escapeHtml(p.category)}</span></div><div><button data-edit="${p.id}">ویرایش</button><button data-del="${p.id}">حذف</button></div></div>`).join("");document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("این محصول حذف شود؟")){products=products.filter(p=>p.id!==b.dataset.del);save();renderProducts();renderAdmin();}});}
$("addProductBtn").onclick=()=>{$("productForm").classList.remove("hidden");$("productForm").reset();$("editId").value="";};
$("cancelProduct").onclick=()=>$("productForm").classList.add("hidden");
function editProduct(id){let p=products.find(x=>x.id===id);$("editId").value=p.id;$("pName").value=p.name;$("pCategory").value=p.category;$("pPrice").value=p.price??"";$("pImage").value=p.image||"";$("pDescription").value=p.description||"";$("productForm").classList.remove("hidden");}
$("productForm").onsubmit=e=>{e.preventDefault();let id=$("editId").value;let p={id:id||"p"+Date.now(),name:$("pName").value.trim(),category:$("pCategory").value,price:$("pPrice").value===""?null:Number($("pPrice").value),image:$("pImage").value.trim(),description:$("pDescription").value.trim()};if(id)products=products.map(x=>x.id===id?p:x);else products.push(p);save();renderProducts();renderAdmin();$("productForm").classList.add("hidden");toast("محصول ذخیره شد");};
$("exportData").onclick=()=>{let blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="herbalia-products.json";a.click();URL.revokeObjectURL(a.href);};
$("menuToggle").onclick=()=>document.querySelector(".main-nav").classList.toggle("open");
document.querySelectorAll(".main-nav a").forEach(a=>a.onclick=()=>document.querySelector(".main-nav").classList.remove("open"));
renderProducts();renderCart();


/* ===== اتصال به Supabase: محصولات و پنل مدیریت واقعی ===== */
const CFG=window.HERBALIA_CONFIG||{};
const sb=(CFG.SUPABASE_URL&&window.supabase)?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
function save(){localStorage.setItem("herbalia_cart",JSON.stringify(cart));}
async function loadProducts(){
 if(!sb)return;
 const {data,error}=await sb.from("products").select("*").order("created_at");
 if(error){toast("خطا در دریافت محصولات");return;}
 products=data;renderProducts();renderCart();
}
function showAdmin(){$("adminLogin").classList.add("hidden");$("adminContent").classList.remove("hidden");renderAdmin();}
$("adminOpen").onclick=async()=>{
 $("adminBackdrop").classList.add("show");
 if(sb){const {data}=await sb.auth.getSession();if(data.session)showAdmin();}
};
$("adminLoginBtn").onclick=async()=>{
 if(!sb){toast("اتصال Supabase هنوز تنظیم نشده (config.js)");return;}
 const {error}=await sb.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
 if(error){toast("ایمیل یا رمز صحیح نیست");return;}
 showAdmin();
};
function renderAdmin(){
 $("adminProducts").innerHTML=products.map(p=>`<div class="admin-product"><div><b>${escapeHtml(p.name)}</b><br><span>${money(p.price)} · ${escapeHtml(p.category)}</span></div><div><button data-edit="${p.id}">ویرایش</button><button data-del="${p.id}">حذف</button></div></div>`).join("");
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(b.dataset.edit));
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
  if(!confirm("این محصول حذف شود؟"))return;
  const {error}=await sb.from("products").delete().eq("id",b.dataset.del);
  if(error){toast("حذف انجام نشد");return;}
  await loadProducts();renderAdmin();
 });
}
$("productForm").onsubmit=async e=>{
 const {data:{user}} = await sb.auth.getUser();
console.log("CURRENT SUPABASE USER:", user?.id, user?.email);
 e.preventDefault();
 const id=$("editId").value;let image=$("pImage").value.trim();
 const f=$("pFile").files[0];
 if(f){
  const ext=(f.name.split(".").pop()||"jpg").toLowerCase();
  const path=Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
  const up=await sb.storage.from("product-images").upload(path,f,{contentType:f.type});
  if(up.error){toast("آپلود عکس انجام نشد");return;}
  image=sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
 }
 const row={name:$("pName").value.trim(),category:$("pCategory").value,price:$("pPrice").value===""?null:Number($("pPrice").value),image,description:$("pDescription").value.trim()};
 const {error}=await (id?sb.from("products").update(row).eq("id",id):sb.from("products").insert(row));
 if(error){console.error("SUPABASE SAVE ERROR:",error);toast(error.message);return;}
 await loadProducts();renderAdmin();$("productForm").classList.add("hidden");toast("محصول ذخیره شد");
};
loadProducts();
