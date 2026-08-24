import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Loader2, BookOpen, Heart, Check, Trash2 } from "lucide-react";

type Book = { id: string; title: string; size: number; fav: boolean; finished: boolean; reading: boolean; addedAt: number; file: Blob; cover: Blob | null; }

const DB="library-final-v2";
function getDB(){return new Promise<IDBDatabase>(r=>{const q=indexedDB.open(DB,1); q.onupgradeneeded=()=>q.result.createObjectStore("books",{keyPath:"id"}); q.onsuccess=()=>r(q.result)})}
async function getAll(){const db=await getDB(); return new Promise<Book[]>(res=>{const t=db.transaction("books").objectStore("books").getAll(); t.onsuccess=()=>res((t.result as Book[]).reverse())})}
async function put(b:Book){const db=await getDB(); db.transaction("books","readwrite").objectStore("books").put(b)}
async function del(id:string){const db=await getDB(); db.transaction("books","readwrite").objectStore("books").delete(id)}
async function renderCover(file: File){
  try{
    const pdfjs:any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc=`//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const buf=await file.arrayBuffer();
    const pdf=await pdfjs.getDocument(buf).promise;
    const page=await pdf.getPage(1);
    const vp=page.getViewport({scale:0.4});
    const c=document.createElement("canvas"); c.width=vp.width; c.height=vp.height;
    await page.render({canvasContext:c.getContext("2d"), viewport:vp}).promise;
    const blob=await new Promise<Blob|null>(r=>c.toBlob(r,"image/jpeg",0.6));
    return blob;
  }catch{return null}
}

export default function Library(){
  const [books,setBooks]=useState<Book[]|null>(null);
  const [category,setCategory]=useState("All Books");
  const [query,setQuery]=useState("");
  const [uploading,setUploading]=useState(false);
  const [selected,setSelected]=useState<Book|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  async function refresh(){setBooks(await getAll())}
  useEffect(()=>{refresh()},[]);

  async function onFiles(files: FileList | null){
    if(!files?.length) return; setUploading(true);
    for(const file of Array.from(files)){
      const cover=await renderCover(file);
      await put({id:crypto.randomUUID(), title:file.name.replace(/\.pdf$/i,""), size:file.size, fav:false, finished:false, reading:false, addedAt:Date.now(), file, cover});
    }
    setUploading(false); if(inputRef.current) inputRef.current.value=""; refresh();
  }

  const filtered=useMemo(()=>{
    const q=query.toLowerCase();
    return (books??[]).filter(b=>{
      if(category==="My Fav" &&!b.fav) return false;
      if(category==="Finished" &&!b.finished) return false;
      if(category==="Currently Reading" &&!b.reading) return false;
      if(q &&!b.title.toLowerCase().includes(q)) return false;
      return true;
    })
  },[books,category,query]);

  if(selected){
    const url=selected.cover?URL.createObjectURL(selected.cover):null;
    const fileUrl=URL.createObjectURL(selected.file);
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <button onClick={()=>{setSelected(null); refresh()}} className="text-xs tracking-widest uppercase opacity-60">← Back to shelf</button>
        <div className="mt-8 grid gap-8 sm:grid-cols-[220px_1fr]">
          <div className="w-[220px] h-[330px] rounded-[24px] bg-[#F6F3EE] overflow-hidden border">{url?<img src={url} className="w-full h-full object-cover"/>:<div className="p-4 font-serif text-xl">{selected.title}</div>}</div>
          <div><h1 className="font-serif text-4xl">{selected.title}</h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={fileUrl} target="_blank" onClick={()=>{put({...selected, reading:true}); setSelected({...selected, reading:true})}} className="inline-flex gap-2 bg
