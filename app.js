// ============================================
// APP.JS - Tüm Sayfalar İçin Ortak JS Dosyası
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    // Sayfa Türlerini Belirle
    const isIndex = document.body.classList.contains('page-index');
    const isForum = document.body.classList.contains('page-forum');
    const isAuth = document.body.classList.contains('page-auth');
    const isStaj = document.body.classList.contains('page-staj');
    const isIletisim = document.body.classList.contains('page-iletisim');

    // Auth Sayfalarındaki Formları Belirle
    const isLoginForm = document.getElementById('login-btn') !== null;
    const isRegisterForm = document.getElementById('register-btn') !== null;

    // Sayfalar arası login yönlendirme butonları (satıriçi JS yerine EventListener)
    document.querySelectorAll('.btn-login-nav, #nav-login-btn').forEach(btn => {
        btn.addEventListener('click', () => { window.location.href = 'login.html'; });
    });

    // ==========================================
    // --- 1. INDEX SAYFASI KODLARI
    // ==========================================
    if (isIndex) {
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + (index * 150));
        });
    }


    // ==========================================
    // --- 2. FORUM, STAJ & İLETİŞİM SAYFASI KODLARI (Auth Gerektirenler)
    // ==========================================
    if ((isForum || isStaj || isIletisim) && typeof window.supabase !== 'undefined') {
        const SUPABASE_URL = '';
        const SUPABASE_ANON = '';
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

        let currentUsername = 'Kullanıcı';

        // Oturum Kontrolü & Başlangıç
        (async () => {
            const { data: { session } } = await sb.auth.getSession();

            if (!session) {
                window.location.href = 'login.html';
                return;
            }

            const user = session.user;
            const meta = user.user_metadata || {};
            currentUsername = meta.username || meta.full_name || user.email.split('@')[0];
            const avatarUrl = meta.avatar_url || null;

            // Widget Gösterimi
            const widget = document.getElementById('user-widget');
            const navLoginBtn = document.getElementById('nav-login-btn');
            if (navLoginBtn) navLoginBtn.style.display = 'none';
            if (widget) widget.style.display = 'flex';

            const widgetName = document.getElementById('widget-name');
            if (widgetName) widgetName.textContent = currentUsername;

            const avatarWrap = document.getElementById('widget-avatar-wrap');
            if (avatarWrap) {
                if (avatarUrl) {
                    avatarWrap.innerHTML = `<img id="widget-avatar" src="${avatarUrl}" alt="${currentUsername}" />`;
                } else {
                    const initials = currentUsername.substring(0, 2).toUpperCase();
                    avatarWrap.innerHTML = `<div id="widget-avatar" class="initials" style="width:34px;height:34px;border-radius:50%;border:2px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--accent-primary);background:var(--bg-elevated);">${initials}</div>`;
                }
            }

            const widgetLogout = document.getElementById('widget-logout');
            if (widgetLogout) {
                widgetLogout.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await sb.auth.signOut();
                    window.location.href = 'login.html';
                });
            }

            // Sayfa yüklendiğinde içerikleri çek
            if (isForum) await loadTopics();
            if (isStaj) {
                await loadInternships();

                // HTML içinden silinen olay tetikleyicilerini ayarla
                document.querySelectorAll('.btn-toggle-internship').forEach(btn => {
                    btn.addEventListener('click', window.toggleInternshipForm);
                });

                const intFormEl = document.getElementById('internship-form-el');
                if (intFormEl) {
                    intFormEl.addEventListener('submit', (e) => {
                        e.preventDefault();
                        window.addInternship();
                    });
                }
            }
        })();

        async function loadTopics() {
            const loadingEl = document.getElementById('loading-indicator');
            const emptyEl = document.getElementById('empty-message');
            const container = document.getElementById('topics-container');
            if (!container) return;

            loadingEl.classList.add('active');
            emptyEl.classList.remove('active');
            container.innerHTML = '';

            const { data: topics, error } = await sb
                .from('forum_topics')
                .select('*')
                .order('created_at', { ascending: false });

            loadingEl.classList.remove('active');

            if (error) {
                console.error('Konular yüklenirken hata:', error);
                emptyEl.textContent = '⚠️ Konular yüklenemedi. Lütfen sayfayı yenileyin.';
                emptyEl.classList.add('active');
                return;
            }

            if (!topics || topics.length === 0) {
                emptyEl.classList.add('active');
                return;
            }

            topics.forEach(topic => renderTopic(topic, container));
        }

        function renderTopic(topic, container) {
            const div = document.createElement('div');
            div.className = 'post-container';
            div.dataset.topicId = topic.id;

            const created = new Date(topic.created_at);
            const timeStr = timeAgo(created);

            div.innerHTML = `
                <div class="forum-row">
                    <div class="forum-info">
                        <div class="icon">📝</div>
                        <div>
                            <a href="#" class="forum-name">${escapeHtml(topic.title)}</a>
                            <p class="forum-desc">${escapeHtml(topic.message)}</p>
                            <p class="forum-author">Yazan: <span class="username">${escapeHtml(topic.author)}</span>, ${timeStr}</p>
                            <button class="comment-toggle-btn" onclick="window.toggleComments(this)">Yorumlar</button>
                        </div>
                    </div>
                    <div class="forum-stats">
                        <span><b class="topic-count">0</b> Konu</span>
                        <span><b class="msg-count">0</b> Mesaj</span>
                    </div>
                    <div class="forum-last-post">
                        <a href="#">${escapeHtml(topic.title)}</a>
                        <p>Yazan: <span class="username">${escapeHtml(topic.author)}</span>, ${timeStr}</p>
                    </div>
                </div>
                <div class="comments-section" style="display: none;" data-loaded="false">
                    <div class="comment-list"></div>
                    <div class="comment-form">
                        <input type="text" placeholder="Yorumunuzu yazın..." class="comment-input">
                        <button type="button" class="submit-btn" onclick="window.addComment(this)">Yanıtla</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        }

        // --- GLOBAL FORUM FONKSİYONLARI ---
        window.toggleEntryForm = function () {
            const form = document.getElementById('entryForm');
            if (form) {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
                document.getElementById('form-error').classList.remove('active');
            }
        };

        window.addEntry = async function () {
            const title = document.getElementById('entryTitle').value.trim();
            const message = document.getElementById('entryMessage').value.trim();
            const errorEl = document.getElementById('form-error');
            const submitBtn = document.getElementById('submit-btn');

            errorEl.classList.remove('active');

            if (title === '' || message === '') {
                errorEl.textContent = 'Lütfen tüm alanları doldurun!';
                errorEl.classList.add('active');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Gönderiliyor...';

            const { data, error } = await sb
                .from('forum_topics')
                .insert([{
                    title: title,
                    message: message,
                    author: currentUsername
                }])
                .select()
                .single();

            submitBtn.disabled = false;
            submitBtn.textContent = 'Gönder';

            if (error) {
                console.error('Konu eklenirken hata:', error);
                errorEl.textContent = '⚠️ Konu eklenemedi: ' + (error.message || 'Bilinmeyen hata');
                errorEl.classList.add('active');
                return;
            }

            document.getElementById('entryTitle').value = '';
            document.getElementById('entryMessage').value = '';
            window.toggleEntryForm();

            const container = document.getElementById('topics-container');
            const emptyEl = document.getElementById('empty-message');
            emptyEl.classList.remove('active');

            const tempContainer = document.createElement('div');
            renderTopic(data, tempContainer);
            container.insertBefore(tempContainer.firstChild, container.firstChild);
        };

        window.toggleComments = async function (btn) {
            const postContainer = btn.closest('.post-container');
            const commentsSection = postContainer.querySelector('.comments-section');
            const isOpen = commentsSection.style.display !== 'none';

            commentsSection.style.display = isOpen ? 'none' : 'block';

            if (!isOpen && commentsSection.dataset.loaded === 'false') {
                await loadReplies(postContainer);
            }
        };

        async function loadReplies(postContainer) {
            const topicId = postContainer.dataset.topicId;
            const commentList = postContainer.querySelector('.comment-list');
            const commentsSection = postContainer.querySelector('.comments-section');

            commentList.innerHTML = '<div style="color:var(--text-dim);padding:10px;font-size:13px;">⏳ Yorumlar yükleniyor...</div>';

            const { data: replies, error } = await sb
                .from('forum_replies')
                .select('*')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true });

            commentsSection.dataset.loaded = 'true';

            if (error) {
                commentList.innerHTML = '<div style="color:var(--danger);padding:10px;font-size:13px;">⚠️ Yorumlar yüklenemedi.</div>';
                return;
            }

            commentList.innerHTML = '';

            if (!replies || replies.length === 0) {
                commentList.innerHTML = '<div style="color:var(--text-dim);padding:10px;font-size:13px;">Henüz yorum yok. İlk yorumu sen yaz!</div>';
            } else {
                replies.forEach(reply => renderReply(reply, commentList));
            }

            const msgCount = postContainer.querySelector('.msg-count');
            if (msgCount) msgCount.textContent = replies ? replies.length : 0;
        }

        function renderReply(reply, commentList) {
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-meta"><span class="username">${escapeHtml(reply.author)}</span> — ${timeAgo(new Date(reply.created_at))}</div>
                <div class="comment-text">${escapeHtml(reply.content)}</div>
            `;
            commentList.appendChild(div);
        }

        window.addComment = async function (btn) {
            const input = btn.previousElementSibling;
            const text = input.value.trim();
            const postContainer = btn.closest('.post-container');
            const topicId = postContainer.dataset.topicId;
            const commentList = postContainer.querySelector('.comment-list');

            if (text === '') return;

            btn.disabled = true;
            btn.textContent = '...';

            const { data, error } = await sb
                .from('forum_replies')
                .insert([{
                    topic_id: topicId,
                    content: text,
                    author: currentUsername
                }])
                .select()
                .single();

            btn.disabled = false;
            btn.textContent = 'Yanıtla';

            if (error) {
                console.error('Yorum eklenemedi:', error);
                alert('Yorum eklenemedi: ' + (error.message || 'Bilinmeyen hata'));
                return;
            }

            const emptyCommentMsg = commentList.querySelector('div[style]');
            if (emptyCommentMsg && emptyCommentMsg.textContent.includes('İlk yorumu')) {
                emptyCommentMsg.remove();
            }

            renderReply(data, commentList);
            input.value = '';

            const msgCount = postContainer.querySelector('.msg-count');
            if (msgCount) msgCount.textContent = parseInt(msgCount.textContent || 0) + 1;
        };

        window.searchForum = function () {
            const searchInput = document.getElementById('searchInput');
            if (!searchInput) return;
            const query = searchInput.value.toLowerCase();
            const posts = document.querySelectorAll('.post-container');

            posts.forEach(post => {
                const title = post.querySelector('.forum-name')?.innerText.toLowerCase() || '';
                const desc = post.querySelector('.forum-desc')?.innerText.toLowerCase() || '';
                post.style.display = (title.includes(query) || desc.includes(query)) ? '' : 'none';
            });
        };

        // ==================
        // STAJ İLANLARI FONKSİYONLARI
        // ==================
        window.toggleInternshipForm = function () {
            const form = document.getElementById('internshipForm');
            if (form) {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
                document.getElementById('internship-error').style.display = 'none';
            }
        };

        window.addInternship = async function () {
            const title = document.getElementById('internshipTitle').value.trim();
            const message = document.getElementById('internshipMessage').value.trim();
            const errorEl = document.getElementById('internship-error');
            const submitBtn = document.getElementById('internship-submit-btn');

            errorEl.style.display = 'none';

            if (title === '' || message === '') {
                errorEl.textContent = 'Lütfen tüm alanları doldurun!';
                errorEl.style.display = 'block';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Paylaşılıyor...';

            const { data, error } = await sb
                .from('staj_ilanlari')
                .insert([{
                    title: title,
                    message: message,
                    author: currentUsername
                }])
                .select()
                .single();

            submitBtn.disabled = false;
            submitBtn.textContent = 'İlanı Paylaş';

            if (error) {
                console.error('İlan eklenirken hata:', error);
                errorEl.textContent = '⚠️ İlan eklenemedi: ' + (error.message || 'Bilinmeyen hata');
                errorEl.style.display = 'block';
                return;
            }

            document.getElementById('internshipTitle').value = '';
            document.getElementById('internshipMessage').value = '';
            window.toggleInternshipForm();

            const container = document.getElementById('internships-container');
            const emptyEl = document.getElementById('empty-internships');
            emptyEl.style.display = 'none';

            const tempContainer = document.createElement('div');
            renderInternship(data, tempContainer);
            container.insertBefore(tempContainer.firstChild, container.firstChild);
        };

        window.deleteInternship = async function (btn, id) {
            if (!confirm("İlanı silmek istediğinize emin misiniz?")) return;

            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Siliniyor...';

            const { error } = await sb
                .from('staj_ilanlari')
                .delete()
                .eq('id', id);

            if (error) {
                alert('İlan silinemedi: ' + error.message);
                btn.disabled = false;
                btn.textContent = originalText;
            } else {
                const item = btn.closest('.internship-item');
                if (item) {
                    item.remove();
                }
            }
        };

        async function loadInternships() {
            const loadingEl = document.getElementById('loading-internships');
            const emptyEl = document.getElementById('empty-internships');
            const container = document.getElementById('internships-container');
            if (!container) return;

            loadingEl.style.display = 'block';
            emptyEl.style.display = 'none';
            container.innerHTML = '';

            const { data: ilanlar, error } = await sb
                .from('staj_ilanlari')
                .select('*')
                .order('created_at', { ascending: false });

            loadingEl.style.display = 'none';

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist
                    emptyEl.textContent = "⚠️ 'staj_ilanlari' veritabanı tablosu henüz mevcut değil. Hata 42P01: Relation staj_ilanlari does not exist.";
                } else {
                    emptyEl.textContent = '⚠️ İlanlar yüklenemedi: ' + error.message;
                }
                emptyEl.style.display = 'block';
                return;
            }

            if (!ilanlar || ilanlar.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }

            ilanlar.forEach(ilan => renderInternship(ilan, container));
        }

        function renderInternship(ilan, container) {
            const div = document.createElement('div');
            div.className = 'internship-item';
            div.dataset.id = ilan.id;

            const created = new Date(ilan.created_at);
            const isOwner = (ilan.author === currentUsername);

            let deleteBtnHtml = '';
            if (isOwner) {
                deleteBtnHtml = `<button class="delete-btn" onclick="window.deleteInternship(this, '${ilan.id}')">Sil</button>`;
            }

            div.innerHTML = `
                <h3><span style="font-size: 20px;">💼</span> ${escapeHtml(ilan.title)}</h3>
                <p>${escapeHtml(ilan.message).replace(/\n/g, '<br>')}</p>
                <div class="internship-meta">
                    <span>Paylaşan: <strong style="color:var(--text-main);">${escapeHtml(ilan.author)}</strong> • ${timeAgo(created)}</span>
                    ${deleteBtnHtml}
                </div>
            `;
            container.appendChild(div);
        }
    }


    // ==========================================
    // --- 3. LOGIN SAYFASI KODLARI
    // ==========================================
    if (isAuth && isLoginForm && typeof window.supabase !== 'undefined') {
        const SUPABASE_URL = '';
        const SUPABASE_ANON = '';
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

        function showAlert(msg, type) {
            const el = document.getElementById('alert');
            el.textContent = msg;
            el.className = 'alert ' + type;
            el.style.display = 'block';
        }

        function setLoading(loading) {
            const btn = document.getElementById('login-btn');
            btn.disabled = loading;
            document.getElementById('spinner').style.display = loading ? 'block' : 'none';
            document.getElementById('btn-text').textContent = loading ? 'Bekleyin...' : 'Giriş Yap';
        }

        function showProfileCard(user) {
            const meta = user.user_metadata || {};
            const username = meta.username || meta.full_name || user.email.split('@')[0];
            const avatarUrl = meta.avatar_url || null;

            document.getElementById('profile-name').textContent = username;
            document.getElementById('profile-email').textContent = user.email;

            const wrap = document.getElementById('profile-avatar-wrap');
            if (avatarUrl) {
                wrap.innerHTML = `<img id="profile-avatar" src="${avatarUrl}" alt="${username}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--border-subtle);" />`;
            } else {
                const initials = username.substring(0, 2).toUpperCase();
                wrap.innerHTML = `<div id="profile-avatar" class="initials-avatar" style="width:52px;height:52px;border-radius:50%;border:2px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--accent-primary);background:var(--bg-elevated);">${initials}</div>`;
            }

            document.getElementById('login-section').style.display = 'none';
            document.getElementById('profile-card').style.display = 'flex';
            document.getElementById('go-forum-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'block';
        }

        function showLoginForm() {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('profile-card').style.display = 'none';
            document.getElementById('go-forum-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
        }

        (async () => {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
                showProfileCard(session.user);
            } else {
                showLoginForm();
            }
        })();

        document.getElementById('go-forum-btn').addEventListener('click', () => { window.location.href = 'Forum.html'; });
        document.getElementById('profile-card').addEventListener('click', () => { window.location.href = 'Forum.html'; });

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await sb.auth.signOut();
            showLoginForm();
        });

        document.getElementById('login-btn').addEventListener('click', async function () {
            const email = document.getElementById('inp-email').value.trim();
            const password = document.getElementById('inp-password').value;

            if (!email || !email.includes('@')) { showAlert('Geçerli bir e-posta adresi girin.', 'error'); return; }
            if (!password || password.length < 6) { showAlert('Şifrenizi girin (en az 6 karakter).', 'error'); return; }

            setLoading(true);

            const { data, error } = await sb.auth.signInWithPassword({ email, password });

            if (error) {
                showAlert('Giriş başarısız: ' + error.message, 'error');
                setLoading(false);
            } else {
                showAlert('Giriş başarılı! Foruma yönlendiriliyorsunuz...', 'success');
                setTimeout(() => { window.location.href = 'Forum.html'; }, 1200);
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && document.getElementById('login-section').style.display !== 'none') {
                document.getElementById('login-btn').click();
            }
        });
    }

    // ==========================================
    // --- 4. REGISTER SAYFASI KODLARI
    // ==========================================
    if (isAuth && isRegisterForm) {
        if (typeof window.supabase === 'undefined') {
            document.getElementById('alert').textContent = 'Bağlantı hatası: Supabase kütüphanesi yüklenemedi.';
            document.getElementById('alert').className = 'alert error';
            document.getElementById('alert').style.display = 'block';
            document.getElementById('register-btn').disabled = true;
        } else {
            const SUPABASE_URL = '';
            const SUPABASE_ANON = '';
            const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

            let selectedFile = null;

            const btn = document.getElementById('avatarBtn') || document.querySelector('.avatar-btn');
            const fileInput = document.getElementById('file-input');
            const img = document.getElementById('avatar-img');

            if (btn && fileInput) {
                btn.addEventListener('click', () => fileInput.click());

                fileInput.addEventListener('change', function () {
                    if (fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];
                        if (file.size > 5 * 1024 * 1024) {
                            showAlert("Fotoğraf 5MB'tan küçük olmalıdır.", 'error');
                            return;
                        }
                        selectedFile = file;
                        const reader = new FileReader();
                        reader.onload = function (ev) {
                            img.src = ev.target.result;
                            img.style.display = 'block';
                            btn.querySelector('svg').style.display = 'none';
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            function showAlert(msg, type) {
                const el = document.getElementById('alert');
                el.textContent = msg;
                el.className = 'alert ' + type;
                el.style.display = 'block';
            }

            function setLoading(loading) {
                const btn = document.getElementById('register-btn');
                const spinner = document.getElementById('spinner');
                const txt = document.getElementById('btn-text');
                btn.disabled = loading;
                spinner.style.display = loading ? 'block' : 'none';
                txt.textContent = loading ? 'İşleniyor...' : 'Kayıt Ol ve Başla';
            }

            function uniqueName(file) {
                const ext = file.name.split('.').pop();
                return Math.random().toString(36).slice(2) + Date.now().toString(36) + '.' + ext;
            }

            document.getElementById('register-btn').addEventListener('click', async function () {
                const username = document.getElementById('inp-username').value.trim();
                const email = document.getElementById('inp-email').value.trim();
                const password = document.getElementById('inp-password').value;

                if (!username || username.length < 3) { showAlert('Kullanıcı adı en az 3 karakter olmalıdır.', 'error'); return; }
                if (!email || !email.includes('@')) { showAlert('Geçerli bir e-posta adresi girin.', 'error'); return; }
                if (!password || password.length < 6) { showAlert('Şifre en az 6 karakter olmalıdır.', 'error'); return; }

                setLoading(true);

                try {
                    let avatarUrl = null;

                    if (selectedFile) {
                        const fname = 'profiles/' + uniqueName(selectedFile);
                        const { error: upErr } = await sb.storage.from('avatars').upload(fname, selectedFile, { cacheControl: '3600', upsert: false });
                        if (upErr) throw new Error('Fotoğraf yüklenemedi: ' + upErr.message);
                        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(fname);
                        avatarUrl = urlData.publicUrl;
                    }

                    const { error: authErr } = await sb.auth.signUp({
                        email, password,
                        options: { data: { username, avatar_url: avatarUrl } }
                    });

                    if (authErr) throw authErr;

                    showAlert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', 'success');
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);

                } catch (err) {
                    showAlert(err.message || 'Bir hata oluştu.', 'error');
                    setLoading(false);
                }
            });
        }
    }

    // ==========================================
    // --- 5. ORTAK YARDIMCI FONKSİYONLAR
    // ==========================================
    // JS'in window objesine eklenmedikleri sürece diğer fonksiyonlara dışarıdan müdahale edilemez, bu yüzden dışarıya çıkarılacaksa window.escapeHtml vs yapılabilir. İhtiyaç durumunda global olarak buraya yazılabilir.
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function timeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'az önce';
        if (diffMin < 60) return `${diffMin} dk önce`;
        if (diffHr < 24) return `${diffHr} saat önce`;
        if (diffDay < 30) return `${diffDay} gün önce`;
        return date.toLocaleDateString('tr-TR');
    }

    // Render fonksiyonları global window'a atanabilir.
    window.escapeHtml = escapeHtml;
    window.timeAgo = timeAgo;

});