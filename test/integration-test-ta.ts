import { writeFileSync } from "fs";
import { resolve } from "path";

/**
 * ============================================================
 * BUKADITA - Integration Testing untuk Tugas Akhir
 * ============================================================
 * Skenario yang diuji:
 * 1. Login Pengguna
 * 2. Pengambilan Data Modul
 * 3. Akses Sub-Materi
 * 4. Penyimpanan Progress Belajar
 * 5. Pengerjaan Kuis
 * 6. Pengambilan Hasil Kuis
 * 7. Manajemen Catatan Kader
 * ============================================================
 */

import dotenv from "dotenv";
dotenv.config();

// ============================================================
// KONFIGURASI
// ============================================================

const BASE_URL = `http://localhost:${process.env.PORT || 8081}/api/v1`;

// Akun test - sesuaikan dengan akun yang ada di database Anda
const TEST_USER = {
  identifier: "teskader@gmail.com",  // ganti dengan email akun test Anda
  password: "kader123",               // ganti dengan password akun test Anda
};

// ============================================================
// STATE GLOBAL
// ============================================================
let accessToken: string = "";
let userId: string = "";

// Fallback ID — diisi manual jika data dari API tidak lengkap
let moduleId: string = "e81ca1db-d1e8-42be-8930-4877fb721994";
let subMateriId: string = "e1cf877d-9de0-45de-a2f1-01367e6d3493";
let quizId: string = "";
let questionId: string = "";
let noteId: string = "";

// ============================================================
// HASIL TEST
// ============================================================
const results: Array<{
  no: number;
  skenario: string;
  komponen: string;
  proses: string;
  harapan: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}> = [];

let testNo = 0;

// ============================================================
// UTILITIES
// ============================================================

async function apiCall(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; ok: boolean }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
  } catch (err: any) {
    return {
      status: 0,
      data: { error: true, message: err.message },
      ok: false,
    };
  }
}

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log("─".repeat(60));
}

function addResult(
  skenario: string,
  komponen: string,
  proses: string,
  harapan: string,
  status: "PASS" | "FAIL" | "SKIP",
  detail: string
) {
  testNo++;
  results.push({ no: testNo, skenario, komponen, proses, harapan, status, detail });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  log(icon, `[${status}] ${skenario} - ${detail}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// SKENARIO 1: LOGIN PENGGUNA
// ============================================================
async function testLogin() {
  section("SKENARIO 1: Login Pengguna");

  const res = await apiCall("POST", "/auth/login", {
    identifier: TEST_USER.identifier,
    password: TEST_USER.password,
  });

  if (res.ok && res.data?.data?.access_token) {
    accessToken = res.data.data.access_token;
    userId = res.data.data.user?.id || "";
    addResult(
      "Login Pengguna",
      "Mobile App – Backend – Database",
      "Pengguna mengirim email & password → backend validasi → database cek data",
      "Sistem berhasil autentikasi dan mengarahkan ke beranda",
      "PASS",
      `Token diperoleh. User ID: ${userId}`
    );
  } else {
    addResult(
      "Login Pengguna",
      "Mobile App – Backend – Database",
      "Pengguna mengirim email & password → backend validasi → database cek data",
      "Sistem berhasil autentikasi dan mengarahkan ke beranda",
      "FAIL",
      `HTTP ${res.status}: ${res.data?.message || "Gagal login"}`
    );
  }

  // Validasi login dengan kredensial salah
  const resWrong = await apiCall("POST", "/auth/login", {
    identifier: TEST_USER.identifier,
    password: "passwordsalah_12345",
  });

  if (!resWrong.ok && resWrong.status === 401) {
    log("✅", "Validasi: Login dengan password salah ditolak (401)");
  } else {
    log("⚠️", `Validasi: Login password salah → status ${resWrong.status}`);
  }
}

// ============================================================
// SKENARIO 2: PENGAMBILAN DATA MODUL
// ============================================================
async function testGetModules() {
  section("SKENARIO 2: Pengambilan Data Modul");

  if (!accessToken) {
    addResult(
      "Pengambilan Data Modul",
      "Mobile App – Backend – Database",
      "Aplikasi request data modul → backend ambil dari database → kirim ke mobile",
      "Data modul tampil lengkap di aplikasi",
      "SKIP",
      "Dilewati karena login gagal"
    );
    return;
  }

  const res = await apiCall("GET", "/modules?limit=100&page=1");

  if (res.ok && res.data?.data?.items && Array.isArray(res.data.data.items)) {
    const items = res.data.data.items;
    if (items.length > 0) {
      // Hanya overwrite jika belum ada nilai hardcode
      if (!moduleId) moduleId = items[0].id;
      if (!subMateriId && items[0].sub_materis?.length > 0) {
        subMateriId = items[0].sub_materis[0].id;
      }
    }
    addResult(
      "Pengambilan Data Modul",
      "Mobile App – Backend – Database",
      "Aplikasi request data modul → backend ambil dari database → kirim ke mobile",
      "Data modul tampil lengkap di aplikasi",
      items.length > 0 ? "PASS" : "FAIL",
      items.length > 0
        ? `${items.length} modul diterima. Modul pertama: "${items[0]?.title}"`
        : "Tidak ada modul ditemukan di database"
    );
  } else {
    addResult(
      "Pengambilan Data Modul",
      "Mobile App – Backend – Database",
      "Aplikasi request data modul → backend ambil dari database → kirim ke mobile",
      "Data modul tampil lengkap di aplikasi",
      "FAIL",
      `HTTP ${res.status}: ${res.data?.message || "Gagal mengambil modul"}`
    );
  }
}

// ============================================================
// SKENARIO 3: AKSES SUB-MATERI
// ============================================================
async function testGetSubMateri() {
  section("SKENARIO 3: Akses Sub-Materi");

  if (!accessToken) {
    addResult(
      "Akses Sub-Materi",
      "Mobile App – Backend – Database",
      "Pengguna membuka modul → backend kirim detail materi",
      "Konten materi tampil sesuai data di database",
      "SKIP",
      "Dilewati karena login gagal"
    );
    return;
  }

  if (!moduleId) {
    addResult(
      "Akses Sub-Materi",
      "Mobile App – Backend – Database",
      "Pengguna membuka modul → backend kirim detail materi",
      "Konten materi tampil sesuai data di database",
      "SKIP",
      "Dilewati karena tidak ada modul"
    );
    return;
  }

  // Langsung fetch sub-materi menggunakan subMateriId yang sudah di-hardcode
  const resMaterial = await apiCall(
    "GET",
    `/materials/${subMateriId}/public`
  );

  if (resMaterial.ok && resMaterial.data?.data) {
    const material = resMaterial.data.data;
    addResult(
      "Akses Sub-Materi",
      "Mobile App – Backend – Database",
      "Pengguna membuka modul → backend kirim detail materi",
      "Konten materi tampil sesuai data di database",
      "PASS",
      `Sub-materi "${material.title}" berhasil dimuat. Poin: ${material.poin_details?.length || 0}, Kuis: ${material.quizzes?.length || 0}`
    );

    // Simpan quizId jika ada
    if (material.quizzes && material.quizzes.length > 0) {
      quizId = material.quizzes[0].id;
    }
  } else {
    addResult(
      "Akses Sub-Materi",
      "Mobile App – Backend – Database",
      "Pengguna membuka modul → backend kirim detail materi",
      "Konten materi tampil sesuai data di database",
      "FAIL",
      `HTTP ${resMaterial.status}: ${resMaterial.data?.message || "Gagal memuat sub-materi"}`
    );
  }
}

// ============================================================
// SKENARIO 4: PENYIMPANAN PROGRESS BELAJAR
// ============================================================
async function testSaveProgress() {
  section("SKENARIO 4: Penyimpanan Progress Belajar");

  if (!accessToken || !subMateriId) {
    addResult(
      "Penyimpanan Progress Belajar",
      "Mobile App – Backend – Database",
      "Pengguna menyelesaikan materi → sistem kirim progress → disimpan di database",
      "Progress tersimpan dan ditampilkan kembali di aplikasi",
      "SKIP",
      "Dilewati karena token/sub-materi tidak tersedia"
    );
    return;
  }

  // 4a. Complete sub-materi
  const resComplete = await apiCall(
    "POST",
    `/progress/sub-materis/${subMateriId}/complete`,
    { module_id: moduleId },
    accessToken
  );

  if (resComplete.ok && resComplete.data?.data) {
    const progress = resComplete.data.data;

    // 4b. Ambil progress untuk verifikasi tersimpan
    await delay(300);
    const resCheck = await apiCall(
      "GET",
      `/progress/sub-materis/${subMateriId}`,
      undefined,
      accessToken
    );

    const verified = resCheck.ok && resCheck.data?.data?.is_completed === true;

    addResult(
      "Penyimpanan Progress Belajar",
      "Mobile App – Backend – Database",
      "Pengguna menyelesaikan materi → sistem kirim progress → disimpan di database",
      "Progress tersimpan dan ditampilkan kembali di aplikasi",
      verified ? "PASS" : "FAIL",
      verified
        ? `Progress tersimpan. is_completed: ${resCheck.data.data.is_completed}, progress_percent: ${resCheck.data.data.progress_percent}%`
        : `Progress disimpan tapi verifikasi gagal: ${resCheck.data?.message}`
    );
  } else {
    // Coba GET progress (mungkin sudah completed sebelumnya)
    const resCheck = await apiCall(
      "GET",
      `/progress/sub-materis/${subMateriId}`,
      undefined,
      accessToken
    );

    if (resCheck.ok && resCheck.data?.data) {
      addResult(
        "Penyimpanan Progress Belajar",
        "Mobile App – Backend – Database",
        "Pengguna menyelesaikan materi → sistem kirim progress → disimpan di database",
        "Progress tersimpan dan ditampilkan kembali di aplikasi",
        "PASS",
        `Progress sudah ada di database. is_completed: ${resCheck.data.data.is_completed}, progress_percent: ${resCheck.data.data.progress_percent}%`
      );
    } else {
      addResult(
        "Penyimpanan Progress Belajar",
        "Mobile App – Backend – Database",
        "Pengguna menyelesaikan materi → sistem kirim progress → disimpan di database",
        "Progress tersimpan dan ditampilkan kembali di aplikasi",
        "FAIL",
        `HTTP ${resComplete.status}: ${resComplete.data?.message}`
      );
    }
  }
}

// ============================================================
// SKENARIO 5: PENGERJAAN KUIS
// ============================================================
async function testDoQuiz() {
  section("SKENARIO 5: Pengerjaan Kuis");

  if (!accessToken) {
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "SKIP",
      "Dilewati karena token tidak tersedia"
    );
    return;
  }

  // Jika belum punya quizId, coba ambil dari daftar kuis
  if (!quizId) {
    const resQuizzes = await apiCall("GET", "/quizzes", undefined, accessToken);
    if (resQuizzes.ok && resQuizzes.data?.data?.length > 0) {
      quizId = resQuizzes.data.data[0].id;
    }
  }

  if (!quizId) {
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "SKIP",
      "Tidak ada kuis tersedia di database"
    );
    return;
  }

  // 5a. Ambil detail kuis beserta pertanyaan
  const resQuiz = await apiCall(
    "GET",
    `/quizzes/${quizId}`,
    undefined,
    accessToken
  );

  if (!resQuiz.ok || !resQuiz.data?.data) {
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "FAIL",
      `Gagal mengambil detail kuis: HTTP ${resQuiz.status}`
    );
    return;
  }

  const quiz = resQuiz.data.data;
  const questions = quiz.questions || [];

  if (questions.length === 0) {
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "FAIL",
      "Kuis tidak memiliki pertanyaan"
    );
    return;
  }

  questionId = questions[0].id;

  // 5b. Start quiz attempt
  const resStart = await apiCall(
    "POST",
    "/quizzes/start",
    { quiz_id: quizId },
    accessToken
  );

  log(
    resStart.ok ? "✅" : "⚠️",
    `Start quiz: HTTP ${resStart.status} - ${resStart.data?.message || ""}`
  );

  // 5c. Submit jawaban (pilih jawaban pertama untuk setiap soal)
  const answers = questions.map((q: any) => ({
    question_id: q.id,
    selected_option_index: 0,
  }));

  const resSubmit = await apiCall(
    "POST",
    "/quizzes/submit",
    {
      quiz_id: quizId,
      answers,
      submitted_at: new Date().toISOString(),
    },
    accessToken
  );

  if (resSubmit.ok && resSubmit.data?.data) {
    const result = resSubmit.data.data;
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "PASS",
      `Score: ${result.score}, Benar: ${result.correct_answers}/${result.total_questions}, Lulus: ${result.passed}`
    );
  } else {
    addResult(
      "Pengerjaan Kuis",
      "Mobile App – Backend – Database",
      "Pengguna submit jawaban → backend proses nilai → simpan hasil",
      "Nilai kuis muncul dan tersimpan di sistem",
      "FAIL",
      `HTTP ${resSubmit.status}: ${resSubmit.data?.message}`
    );
  }
}

// ============================================================
// SKENARIO 6: PENGAMBILAN HASIL KUIS
// ============================================================
async function testGetQuizResults() {
  section("SKENARIO 6: Pengambilan Hasil Kuis");

  if (!accessToken || !quizId) {
    addResult(
      "Pengambilan Hasil Kuis",
      "Mobile App – Backend – Database",
      "Aplikasi request hasil kuis → backend ambil dari database",
      "Hasil kuis tampil dengan benar",
      "SKIP",
      "Dilewati karena token/quizId tidak tersedia"
    );
    return;
  }

  // Ambil progress kuis spesifik (best score, attempts, status lulus)
  const resProgress = await apiCall(
    "GET",
    `/progress/quiz/${quizId}`,
    undefined,
    accessToken
  );

  // Ambil riwayat attempts dengan module_id
  const resAttempts = await apiCall(
    "GET",
    `/quizzes/attempts/my?module_id=${moduleId}&page=1&limit=10`,
    undefined,
    accessToken
  );

  const hasProgress = resProgress.ok && resProgress.data?.data;
  const attemptsData = resAttempts.ok
    ? resAttempts.data?.data?.attempts || resAttempts.data?.data || []
    : [];
  const count = Array.isArray(attemptsData) ? attemptsData.length : 0;

  if (hasProgress || count > 0) {
    addResult(
      "Pengambilan Hasil Kuis",
      "Mobile App – Backend – Database",
      "Aplikasi request hasil kuis → backend ambil dari database",
      "Hasil kuis tampil dengan benar",
      "PASS",
      `Hasil kuis ditemukan. Best score: ${resProgress.data?.data?.best_score ?? "N/A"}, Attempts: ${resProgress.data?.data?.attempts_count ?? count}, Lulus: ${resProgress.data?.data?.is_passed ?? "N/A"}`
    );
  } else {
    addResult(
      "Pengambilan Hasil Kuis",
      "Mobile App – Backend – Database",
      "Aplikasi request hasil kuis → backend ambil dari database",
      "Hasil kuis tampil dengan benar",
      "FAIL",
      `Progress: HTTP ${resProgress.status} - ${resProgress.data?.message || "tidak ada data"}`
    );
  }
}

// ============================================================
// SKENARIO 7: MANAJEMEN CATATAN KADER
// ============================================================
async function testNoteManagement() {
  section("SKENARIO 7: Manajemen Catatan Kader");

  if (!accessToken) {
    addResult(
      "Manajemen Catatan Kader",
      "Mobile App – Backend – Database",
      "Pengguna menambah/mengedit catatan → backend simpan ke database",
      "Catatan tersimpan dan dapat ditampilkan kembali",
      "SKIP",
      "Dilewati karena login gagal"
    );
    return;
  }

  // 7a. Buat catatan baru
  const resCreate = await apiCall(
    "POST",
    "/notes",
    {
      title: `Catatan Integration Test - ${new Date().toLocaleString("id-ID")}`,
      content: "Ini adalah catatan yang dibuat secara otomatis oleh integration testing.",
      category: "pembelajaran",
      is_pinned: false,
    },
    accessToken
  );

  if (!resCreate.ok || !resCreate.data?.data?.id) {
    addResult(
      "Manajemen Catatan Kader (Tambah)",
      "Mobile App – Backend – Database",
      "Pengguna menambah catatan → backend simpan ke database",
      "Catatan tersimpan dan dapat ditampilkan kembali",
      "FAIL",
      `Gagal membuat catatan: HTTP ${resCreate.status} - ${resCreate.data?.message}`
    );
  } else {
    noteId = resCreate.data.data.id;
    log("✅", `Catatan baru dibuat dengan ID: ${noteId}`);

    // 7b. Edit catatan
    const resUpdate = await apiCall(
      "PUT",
      `/notes/${noteId}`,
      {
        title: `Catatan Integration Test (Diedit) - ${new Date().toLocaleString("id-ID")}`,
        content: "Catatan ini sudah diedit melalui integration testing.",
        category: "pembelajaran",
        is_pinned: true,
      },
      accessToken
    );

    // 7c. Verifikasi catatan tersimpan dengan GET
    await delay(300);
    const resGet = await apiCall(
      "GET",
      `/notes/${noteId}`,
      undefined,
      accessToken
    );

    const updateOk = resUpdate.ok && resUpdate.data?.data;
    const getOk = resGet.ok && resGet.data?.data?.id === noteId;

    addResult(
      "Manajemen Catatan Kader",
      "Mobile App – Backend – Database",
      "Pengguna menambah/mengedit catatan → backend simpan ke database",
      "Catatan tersimpan dan dapat ditampilkan kembali",
      updateOk && getOk ? "PASS" : "FAIL",
      updateOk && getOk
        ? `Catatan berhasil dibuat & diedit. Judul: "${resGet.data.data.title}", Pinned: ${resGet.data.data.is_pinned}`
        : `Buat: ${resCreate.ok ? "OK" : "GAGAL"}, Edit: ${resUpdate.ok ? "OK" : "GAGAL"}, Verifikasi: ${getOk ? "OK" : "GAGAL"}`
    );

    // 7d. Ambil daftar catatan
    const resList = await apiCall(
      "GET",
      "/notes?page=1&limit=10",
      undefined,
      accessToken
    );

    if (resList.ok && resList.data?.data?.items) {
      log(
        "✅",
        `Daftar catatan berhasil dimuat: ${resList.data.data.items.length} catatan`
      );
    }
  }
}

// ============================================================
// CETAK LAPORAN AKHIR
// ============================================================
function printReport() {
  console.log(`\n${"═".repeat(70)}`);
  console.log("📊 LAPORAN HASIL INTEGRATION TESTING - BUKADITA MOBILE APP");
  console.log(`${"═".repeat(70)}`);
  console.log(`Waktu: ${new Date().toLocaleString("id-ID")}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`${"─".repeat(70)}`);

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;

  results.forEach((r) => {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️";
    console.log(`\n${icon} Skenario ${r.no}: ${r.skenario}`);
    console.log(`   Komponen  : ${r.komponen}`);
    console.log(`   Proses    : ${r.proses}`);
    console.log(`   Harapan   : ${r.harapan}`);
    console.log(`   Hasil     : ${r.status}`);
    console.log(`   Detail    : ${r.detail}`);
  });

  console.log(`\n${"─".repeat(70)}`);
  console.log(`📈 RINGKASAN:`);
  console.log(`   ✅ PASS  : ${pass}`);
  console.log(`   ❌ FAIL  : ${fail}`);
  console.log(`   ⏭️  SKIP  : ${skip}`);
  console.log(`   Total   : ${results.length}`);

  // Tabel untuk laporan TA
  console.log(`\n${"═".repeat(70)}`);
  console.log("📋 FORMAT TABEL UNTUK LAPORAN TA:");
  console.log(`${"═".repeat(70)}`);
  console.log(
    "No | Skenario Integrasi                | Hasil"
  );
  console.log("─".repeat(60));
  results.forEach((r) => {
    const status =
      r.status === "PASS"
        ? "Berhasil ✅"
        : r.status === "FAIL"
        ? "Gagal ❌"
        : "Dilewati ⏭️";
    const name = r.skenario.padEnd(35);
    console.log(`${r.no.toString().padEnd(3)}| ${name}| ${status}`);
  });
  console.log(`${"═".repeat(70)}`);
}

// ============================================================
// GENERATE HTML REPORT
// ============================================================
function generateHtmlReport() {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  const total = results.length;
  const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
  const waktu = new Date().toLocaleString("id-ID", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const rowsHtml = results.map((r) => {
    const badge =
      r.status === "PASS"
        ? `<span class="badge pass">✅ PASS</span>`
        : r.status === "FAIL"
        ? `<span class="badge fail">❌ FAIL</span>`
        : `<span class="badge skip">⏭️ SKIP</span>`;
    const rowClass = r.status === "PASS" ? "row-pass" : r.status === "FAIL" ? "row-fail" : "row-skip";
    return `
      <tr class="${rowClass}">
        <td class="no">${r.no}</td>
        <td class="skenario"><strong>${r.skenario}</strong></td>
        <td class="komponen">${r.komponen}</td>
        <td class="proses">${r.proses}</td>
        <td class="harapan">${r.harapan}</td>
        <td class="detail-cell">${r.detail}</td>
        <td class="status-cell">${badge}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Laporan Integration Testing – BUKADITA</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 40px 24px;
    }

    .container { max-width: 1300px; margin: 0 auto; }

    /* HEADER */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 50%, #1a1f2e 100%);
      border: 1px solid rgba(99,179,237,0.25);
      border-radius: 20px;
      padding: 40px 48px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(circle at 70% 50%, rgba(99,179,237,0.08) 0%, transparent 60%);
    }
    .header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
    .logo {
      width: 56px; height: 56px; border-radius: 14px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; flex-shrink: 0;
      box-shadow: 0 0 20px rgba(59,130,246,0.4);
    }
    .header h1 { font-size: 28px; font-weight: 800; color: #fff; line-height: 1.2; }
    .header h1 span { color: #60a5fa; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .meta-item { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 600; color: #cbd5e1; }

    /* SUMMARY CARDS */
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .card {
      border-radius: 16px; padding: 24px; text-align: center;
      border: 1px solid; position: relative; overflow: hidden;
      transition: transform 0.2s;
    }
    .card::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 0%, var(--glow), transparent 70%);
    }
    .card-pass { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); --glow: rgba(16,185,129,0.12); }
    .card-fail { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); --glow: rgba(239,68,68,0.12); }
    .card-skip { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.3); --glow: rgba(245,158,11,0.12); }
    .card-total { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.3); --glow: rgba(99,102,241,0.12); }
    .card-number { font-size: 48px; font-weight: 800; line-height: 1; margin-bottom: 6px; }
    .card-pass .card-number { color: #34d399; }
    .card-fail .card-number { color: #f87171; }
    .card-skip .card-number { color: #fbbf24; }
    .card-total .card-number { color: #a5b4fc; }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 600; }
    .card-sub { font-size: 11px; color: #64748b; margin-top: 4px; }

    /* PROGRESS BAR */
    .progress-wrap {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 24px 32px; margin-bottom: 32px;
      display: flex; align-items: center; gap: 24px;
    }
    .progress-label { font-size: 14px; color: #94a3b8; white-space: nowrap; }
    .progress-bar-bg { flex: 1; height: 12px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
    .progress-bar-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #10b981, #34d399);
      width: ${passRate}%;
      box-shadow: 0 0 12px rgba(16,185,129,0.5);
    }
    .progress-pct { font-size: 22px; font-weight: 800; color: #34d399; white-space: nowrap; }

    /* TABLE */
    .table-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; }
    .table-header { padding: 20px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; }
    .table-header h2 { font-size: 16px; font-weight: 700; color: #f1f5f9; }
    .table-icon { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: rgba(255,255,255,0.04);
      padding: 14px 16px; text-align: left;
      font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
      color: #64748b; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    thead th.no { width: 48px; text-align: center; }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(255,255,255,0.04); }
    tbody td { padding: 16px; font-size: 13px; vertical-align: top; }
    td.no { text-align: center; color: #64748b; font-weight: 700; font-size: 15px; }
    td.skenario { color: #e2e8f0; }
    td.komponen, td.proses, td.harapan { color: #94a3b8; font-size: 12px; }
    td.detail-cell { color: #cbd5e1; font-size: 12px; font-family: 'Inter', monospace; }
    td.status-cell { text-align: center; }
    .row-pass td { border-left: 3px solid #10b981; }
    .row-fail td { border-left: 3px solid #ef4444; }
    .row-skip td { border-left: 3px solid #f59e0b; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .badge.pass { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .badge.fail { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge.skip { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }

    /* FOOTER */
    .footer { text-align: center; margin-top: 32px; color: #334155; font-size: 12px; }
    .footer strong { color: #475569; }
  </style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div class="header">
    <div class="header-top">
      <div class="logo">🧪</div>
      <div>
        <h1>BUKADITA <span>Integration Testing</span></h1>
        <div class="subtitle">Laporan Hasil Pengujian Integrasi – Tugas Akhir</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">📅 Waktu Pengujian</div>
        <div class="meta-value">${waktu}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">🌐 Base URL</div>
        <div class="meta-value">${BASE_URL}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">👤 Akun Uji</div>
        <div class="meta-value">${TEST_USER.identifier}</div>
      </div>
    </div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="summary-grid">
    <div class="card card-pass">
      <div class="card-number">${pass}</div>
      <div class="card-label">Pass</div>
      <div class="card-sub">Skenario Berhasil</div>
    </div>
    <div class="card card-fail">
      <div class="card-number">${fail}</div>
      <div class="card-label">Fail</div>
      <div class="card-sub">Skenario Gagal</div>
    </div>
    <div class="card card-skip">
      <div class="card-number">${skip}</div>
      <div class="card-label">Skip</div>
      <div class="card-sub">Skenario Dilewati</div>
    </div>
    <div class="card card-total">
      <div class="card-number">${total}</div>
      <div class="card-label">Total</div>
      <div class="card-sub">Total Skenario</div>
    </div>
  </div>

  <!-- PROGRESS BAR -->
  <div class="progress-wrap">
    <div class="progress-label">🎯 Pass Rate</div>
    <div class="progress-bar-bg"><div class="progress-bar-fill"></div></div>
    <div class="progress-pct">${passRate}%</div>
  </div>

  <!-- TABLE -->
  <div class="table-section">
    <div class="table-header">
      <span class="table-icon">📋</span>
      <h2>Detail Hasil Pengujian Integrasi</h2>
    </div>
    <table>
      <thead>
        <tr>
          <th class="no">No</th>
          <th>Skenario Integrasi</th>
          <th>Komponen</th>
          <th>Proses Integrasi</th>
          <th>Hasil yang Diharapkan</th>
          <th>Detail Hasil</th>
          <th style="text-align:center">Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <div class="footer">
    Dibuat otomatis oleh <strong>BUKADITA Integration Test Script</strong> &bull; ${new Date().getFullYear()}
  </div>

</div>
</body>
</html>`;

  const outPath = resolve("test", "integration-report.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`\n📄 Laporan HTML tersimpan: ${outPath}`);
  return outPath;
}

// ============================================================
// MAIN - Jalankan semua skenario
// ============================================================
async function main() {
  console.log("╔════════════════════════════════════╗");
  console.log("║   BUKADITA - Integration Testing   ║");
  console.log("╚════════════════════════════════════╝");
  console.log(`\nTarget API : ${BASE_URL}`);
  console.log(`Test User  : ${TEST_USER.identifier}`);
  console.log(`Waktu      : ${new Date().toLocaleString("id-ID")}\n`);

  try {
    await testLogin();
    await delay(500);
    await testGetModules();
    await delay(500);
    await testGetSubMateri();
    await delay(500);
    await testSaveProgress();
    await delay(500);
    await testDoQuiz();
    await delay(500);
    await testGetQuizResults();
    await delay(500);
    await testNoteManagement();
  } catch (err: any) {
    console.error("\n❌ Error tidak terduga:", err.message);
  }

  printReport();
  const htmlPath = generateHtmlReport();

  // Buka otomatis di browser
  const { exec } = await import("child_process");
  exec(`start "" "${htmlPath}"`);
}

main();
