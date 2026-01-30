// =====================================================
// 포도책방 통합 관리시스템 - 데이터베이스 (v2)
// 제안서 스펙 100% 반영
// =====================================================

// ===================== 기본 DB 함수 =====================
const PodoDB = {
    get(key) {
        const data = localStorage.getItem('podo_' + key);
        return data ? JSON.parse(data) : null;
    },
    set(key, value) {
        localStorage.setItem('podo_' + key, JSON.stringify(value));
    },
    remove(key) {
        localStorage.removeItem('podo_' + key);
    },
    // ID 생성 (점주번호 등은 별도 함수)
    generateId(prefix) {
        return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
};

// ===================== 점주번호 생성 =====================
// MP001 (목포), GH001 (강화), GJ001 (광주)
function generateOwnerNumber(branchId) {
    const prefixMap = { 'BR001': 'MP', 'BR002': 'GH', 'BR003': 'GJ' };
    const prefix = prefixMap[branchId] || 'XX';
    const owners = (PodoDB.get('owners') || []).filter(o => o.branchId === branchId);
    const nextNum = owners.length + 1;
    return prefix + String(nextNum).padStart(3, '0');
}

// ===================== 책장번호 체계 =====================
// S = 소형(작은책장), L = 대형(큰책장), F = 평대, M = 미니
// 예: S01, S02, L01, F01, M01
const SHELF_TYPES = {
    M: { name: '미니', price: 3000, capacity: 10 },
    S: { name: '소형(작은책장)', price: 10000, capacity: 30 },
    L: { name: '대형(큰책장)', price: 20000, capacity: 60 },
    F: { name: '평대', price: 30000, capacity: 100 }
};

// ===================== 상품 상태 & 정산 배분율 =====================
// 책 상태
const BOOK_STATUS = {
    'order_new': { name: '주문새책', shopRate: 0, ownerRate: 100, desc: '포도책방 통해 주문한 새 책' },
    'owner_new': { name: '점주새책', shopRate: 15, ownerRate: 85, desc: '점주가 직접 가져온 새 책' },
    'used': { name: '헌책', shopRate: 50, ownerRate: 50, desc: '중고 책' }
};

// 굿즈 상태
const GOODS_STATUS = {
    'podo': { name: '포도', shopRate: 100, ownerRate: 0, desc: '포도책방 자체 제작' },
    'collab': { name: '협력', shopRate: 30, ownerRate: 70, desc: '책방+점주 협력 제작' },
    'handmade': { name: '자작', shopRate: 20, ownerRate: 80, desc: '점주 직접 제작' },
    'consign': { name: '위탁', shopRate: 20, ownerRate: 80, desc: '점주가 구입하여 판매' }
};

// ===================== 정산 계산 =====================
function calculateSettlement(price, type, status) {
    const statusMap = type === 'book' ? BOOK_STATUS : GOODS_STATUS;
    const rates = statusMap[status] || { shopRate: 50, ownerRate: 50 };
    const shopAmount = Math.round(price * rates.shopRate / 100);
    const ownerAmount = price - shopAmount;
    return { shopAmount, ownerAmount, shopRate: rates.shopRate, ownerRate: rates.ownerRate };
}

// ===================== 세션 관리 =====================
const PodoSession = {
    get() {
        const data = localStorage.getItem('podo_session');
        return data ? JSON.parse(data) : null;
    },
    set(user, type, branchId = null) {
        localStorage.setItem('podo_session', JSON.stringify({
            user, type, branchId,
            loginAt: new Date().toISOString()
        }));
    },
    clear() {
        localStorage.removeItem('podo_session');
    }
};

// ===================== 초기 데이터 =====================
function initializeData() {
    // 이미 초기화됐으면 스킵
    if (PodoDB.get('initialized_v2')) return;

    // 지점 (고정 - 추가 불가)
    PodoDB.set('branches', [
        { id: 'BR001', name: '목포점', code: 'MP', address: '전라남도 목포시 수강로4번길 19', icon: '🏛️', color: '#667eea', area: 100, status: 'active' },
        { id: 'BR002', name: '강화점', code: 'GH', address: '인천광역시 강화군 강화읍 중앙로', icon: '🌊', color: '#f093fb', area: 20, status: 'active' },
        { id: 'BR003', name: '광주점', code: 'GJ', address: '광주광역시 동구', icon: '🌟', color: '#4facfe', area: 150, status: 'pending' }
    ]);

    // 책장 생성 - 목포점 (220개)
    const shelves = [];
    // 목포 - 미니 40개, 소형 100개, 대형 60개, 평대 20개
    for (let i = 1; i <= 40; i++) shelves.push({ id: `SH-MP-M${i}`, code: `M${String(i).padStart(2,'0')}`, branchId: 'BR001', type: 'M', price: 3000, ownerId: null });
    for (let i = 1; i <= 100; i++) shelves.push({ id: `SH-MP-S${i}`, code: `S${String(i).padStart(2,'0')}`, branchId: 'BR001', type: 'S', price: 10000, ownerId: null });
    for (let i = 1; i <= 60; i++) shelves.push({ id: `SH-MP-L${i}`, code: `L${String(i).padStart(2,'0')}`, branchId: 'BR001', type: 'L', price: 20000, ownerId: null });
    for (let i = 1; i <= 20; i++) shelves.push({ id: `SH-MP-F${i}`, code: `F${String(i).padStart(2,'0')}`, branchId: 'BR001', type: 'F', price: 30000, ownerId: null });
    
    // 강화 - 미니 30개, 소형 80개, 대형 30개, 평대 10개
    for (let i = 1; i <= 30; i++) shelves.push({ id: `SH-GH-M${i}`, code: `M${String(i).padStart(2,'0')}`, branchId: 'BR002', type: 'M', price: 3000, ownerId: null });
    for (let i = 1; i <= 80; i++) shelves.push({ id: `SH-GH-S${i}`, code: `S${String(i).padStart(2,'0')}`, branchId: 'BR002', type: 'S', price: 10000, ownerId: null });
    for (let i = 1; i <= 30; i++) shelves.push({ id: `SH-GH-L${i}`, code: `L${String(i).padStart(2,'0')}`, branchId: 'BR002', type: 'L', price: 20000, ownerId: null });
    for (let i = 1; i <= 10; i++) shelves.push({ id: `SH-GH-F${i}`, code: `F${String(i).padStart(2,'0')}`, branchId: 'BR002', type: 'F', price: 30000, ownerId: null });

    // 광주 (준비중) - 미니 50개, 소형 150개, 대형 80개, 평대 20개
    for (let i = 1; i <= 50; i++) shelves.push({ id: `SH-GJ-M${i}`, code: `M${String(i).padStart(2,'0')}`, branchId: 'BR003', type: 'M', price: 3000, ownerId: null });
    for (let i = 1; i <= 150; i++) shelves.push({ id: `SH-GJ-S${i}`, code: `S${String(i).padStart(2,'0')}`, branchId: 'BR003', type: 'S', price: 10000, ownerId: null });
    for (let i = 1; i <= 80; i++) shelves.push({ id: `SH-GJ-L${i}`, code: `L${String(i).padStart(2,'0')}`, branchId: 'BR003', type: 'L', price: 20000, ownerId: null });
    for (let i = 1; i <= 20; i++) shelves.push({ id: `SH-GJ-F${i}`, code: `F${String(i).padStart(2,'0')}`, branchId: 'BR003', type: 'F', price: 30000, ownerId: null });

    PodoDB.set('shelves', shelves);

    // 샘플 점주
    const owners = [
        { id: 'OW001', ownerNumber: 'MP001', name: '김포도', phone: '010-1234-5678', email: 'kim@test.com', branchId: 'BR001', shelves: ['S01', 'S02'], bank: '국민 123-456-789012', password: '1234', balance: 185500, status: 'active', createdAt: '2024-06-15' },
        { id: 'OW002', ownerNumber: 'MP002', name: '이책방', phone: '010-2345-6789', email: 'lee@test.com', branchId: 'BR001', shelves: ['L01'], bank: '신한 234-567-890123', password: '1234', balance: 92000, status: 'active', createdAt: '2024-07-20' },
        { id: 'OW003', ownerNumber: 'GH001', name: '박문학', phone: '010-3456-7890', email: 'park@test.com', branchId: 'BR002', shelves: ['S01', 'S02', 'S03'], bank: '우리 345-678-901234', password: '1234', balance: 156000, status: 'active', createdAt: '2024-08-10' },
        { id: 'OW004', ownerNumber: 'MP003', name: '최서점', phone: '010-4567-8901', email: 'choi@test.com', branchId: 'BR001', shelves: ['F01'], bank: '하나 456-789-012345', password: '1234', balance: 0, status: 'active', createdAt: '2024-09-01' }
    ];
    PodoDB.set('owners', owners);

    // 책장 점주 할당
    const updatedShelves = shelves.map(s => {
        if (s.branchId === 'BR001' && s.code === 'S01') return { ...s, ownerId: 'OW001' };
        if (s.branchId === 'BR001' && s.code === 'S02') return { ...s, ownerId: 'OW001' };
        if (s.branchId === 'BR001' && s.code === 'L01') return { ...s, ownerId: 'OW002' };
        if (s.branchId === 'BR001' && s.code === 'F01') return { ...s, ownerId: 'OW004' };
        if (s.branchId === 'BR002' && s.code === 'S01') return { ...s, ownerId: 'OW003' };
        if (s.branchId === 'BR002' && s.code === 'S02') return { ...s, ownerId: 'OW003' };
        if (s.branchId === 'BR002' && s.code === 'S03') return { ...s, ownerId: 'OW003' };
        return s;
    });
    PodoDB.set('shelves', updatedShelves);

    // 샘플 책
    const books = [
        { id: 'BK001', type: 'book', isbn: '9788937460784', title: '데미안', author: '헤르만 헤세', publisher: '민음사', pubYear: '2009', cover: '', price: 12000, originalPrice: 12000, qty: 1, status: 'used', shelf: 'S01', ownerId: 'OW001', ownerNumber: 'MP001', branchId: 'BR001', saleStatus: 'available', createdAt: '2024-09-01' },
        { id: 'BK002', type: 'book', isbn: '9788937473135', title: '아몬드', author: '손원평', publisher: '창비', pubYear: '2017', cover: '', price: 12000, originalPrice: 12000, qty: 1, status: 'owner_new', shelf: 'S02', ownerId: 'OW001', ownerNumber: 'MP001', branchId: 'BR001', saleStatus: 'available', createdAt: '2024-09-05' },
        { id: 'BK003', type: 'book', isbn: '9791190030915', title: '달러구트 꿈 백화점', author: '이미예', publisher: '팩토리나인', pubYear: '2020', cover: '', price: 14000, originalPrice: 14000, qty: 2, status: 'order_new', shelf: 'L01', ownerId: 'OW002', ownerNumber: 'MP002', branchId: 'BR001', saleStatus: 'available', createdAt: '2024-09-10' },
        { id: 'BK004', type: 'book', isbn: '9788932917245', title: '어린 왕자', author: '생텍쥐페리', publisher: '문학동네', pubYear: '2015', cover: '', price: 10000, originalPrice: 12000, qty: 1, status: 'used', shelf: 'S01', ownerId: 'OW003', ownerNumber: 'GH001', branchId: 'BR002', saleStatus: 'available', createdAt: '2024-09-15' },
        { id: 'BK005', type: 'book', isbn: '9791168340442', title: '불편한 편의점', author: '김호연', publisher: '나무옆의자', pubYear: '2021', cover: '', price: 14000, originalPrice: 14000, qty: 1, status: 'owner_new', shelf: 'S02', ownerId: 'OW003', ownerNumber: 'GH001', branchId: 'BR002', saleStatus: 'available', createdAt: '2024-09-20' }
    ];
    PodoDB.set('books', books);

    // 샘플 굿즈
    const goods = [
        { id: 'GD001', type: 'goods', name: '포도책방 에코백', price: 15000, qty: 10, status: 'podo', shelf: '', ownerId: null, ownerNumber: '', branchId: 'BR001', saleStatus: 'available', createdAt: '2024-09-01' },
        { id: 'GD002', type: 'goods', name: '손글씨 엽서 세트', price: 8000, qty: 5, status: 'handmade', shelf: 'S01', ownerId: 'OW001', ownerNumber: 'MP001', branchId: 'BR001', saleStatus: 'available', createdAt: '2024-09-10' },
        { id: 'GD003', type: 'goods', name: '강화 특산 북마크', price: 5000, qty: 20, status: 'collab', shelf: 'S01', ownerId: 'OW003', ownerNumber: 'GH001', branchId: 'BR002', saleStatus: 'available', createdAt: '2024-09-15' }
    ];
    PodoDB.set('goods', goods);

    // 샘플 판매
    const today = new Date().toISOString().split('T')[0];
    const sales = [
        { id: 'SL001', itemId: 'BK001', itemType: 'book', itemTitle: '데미안', price: 12000, status: 'used', shopAmount: 6000, ownerAmount: 6000, ownerId: 'OW001', ownerNumber: 'MP001', branchId: 'BR001', method: 'card', saleStatus: 'completed', createdAt: today + ' 14:32', refundedAt: null },
        { id: 'SL002', itemId: 'GD002', itemType: 'goods', itemTitle: '손글씨 엽서 세트', price: 8000, status: 'handmade', shopAmount: 1600, ownerAmount: 6400, ownerId: 'OW001', ownerNumber: 'MP001', branchId: 'BR001', method: 'cash', saleStatus: 'completed', createdAt: today + ' 15:10', refundedAt: null }
    ];
    PodoDB.set('sales', sales);

    // 정산
    PodoDB.set('settlements', [
        { id: 'ST001', period: '2024-12', ownerId: 'OW001', ownerNumber: 'MP001', ownerName: '김포도', totalSales: 245000, shopAmount: 48500, ownerAmount: 196500, rent: 20000, finalAmount: 176500, status: 'completed', paidAt: '2025-01-10' }
    ]);

    // 관리자
    PodoDB.set('admins', [{ id: 'admin', password: 'admin123', name: '시스템 관리자', role: 'super' }]);
    PodoDB.set('branchAdmins', [
        { id: 'mokpo', password: '1234', branchId: 'BR001', name: '목포점 관리자' },
        { id: 'ganghwa', password: '1234', branchId: 'BR002', name: '강화점 관리자' },
        { id: 'gwangju', password: '1234', branchId: 'BR003', name: '광주점 관리자' }
    ]);

    // 알림
    PodoDB.set('notifications', [
        { id: 'NF001', type: 'sale', message: '데미안이 판매되었습니다 (₩12,000)', targetType: 'owner', targetId: 'OW001', read: false, createdAt: new Date().toISOString() },
        { id: 'NF002', type: 'settlement', message: '2024년 12월 정산이 완료되었습니다', targetType: 'owner', targetId: 'OW001', read: false, createdAt: new Date().toISOString() },
        { id: 'NF003', type: 'system', message: '포도책방 관리시스템이 오픈되었습니다', targetType: 'all', targetId: null, read: false, createdAt: new Date().toISOString() }
    ]);

    PodoDB.set('initialized_v2', true);
    console.log('✅ 포도책방 데이터 초기화 완료 (v2)');
}

// ===================== 알림 시스템 =====================
const PodoNotification = {
    get() { return PodoDB.get('notifications') || []; },
    add(type, message, targetType = 'all', targetId = null) {
        const notifications = this.get();
        notifications.unshift({
            id: PodoDB.generateId('NF'),
            type, message, targetType, targetId,
            read: false,
            createdAt: new Date().toISOString()
        });
        if (notifications.length > 100) notifications.pop();
        PodoDB.set('notifications', notifications);
    },
    getUnreadCount(targetType, targetId = null) {
        return this.get().filter(n => 
            !n.read && 
            (n.targetType === 'all' || n.targetType === targetType) &&
            (!targetId || !n.targetId || n.targetId === targetId)
        ).length;
    },
    getForUser(targetType, targetId = null, limit = 20) {
        return this.get().filter(n =>
            (n.targetType === 'all' || n.targetType === targetType) &&
            (!targetId || !n.targetId || n.targetId === targetId)
        ).slice(0, limit);
    },
    markAllRead(targetType, targetId = null) {
        const notifications = this.get();
        notifications.forEach(n => {
            if ((n.targetType === 'all' || n.targetType === targetType) &&
                (!targetId || !n.targetId || n.targetId === targetId)) {
                n.read = true;
            }
        });
        PodoDB.set('notifications', notifications);
    }
};

// ===================== 판매 처리 =====================
function processSale(item, method = 'card') {
    const sales = PodoDB.get('sales') || [];
    const settlement = calculateSettlement(item.price, item.type, item.status);
    
    const sale = {
        id: PodoDB.generateId('SL'),
        itemId: item.id,
        itemType: item.type,
        itemTitle: item.title || item.name,
        price: item.price,
        status: item.status,
        shopAmount: settlement.shopAmount,
        ownerAmount: settlement.ownerAmount,
        ownerId: item.ownerId,
        ownerNumber: item.ownerNumber,
        branchId: item.branchId,
        method: method,
        saleStatus: 'completed',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        refundedAt: null
    };
    
    sales.push(sale);
    PodoDB.set('sales', sales);
    
    // 재고 차감
    if (item.type === 'book') {
        const books = PodoDB.get('books') || [];
        const idx = books.findIndex(b => b.id === item.id);
        if (idx >= 0) {
            if (books[idx].qty > 1) {
                books[idx].qty--;
            } else {
                books[idx].saleStatus = 'sold';
            }
            PodoDB.set('books', books);
        }
    } else {
        const goods = PodoDB.get('goods') || [];
        const idx = goods.findIndex(g => g.id === item.id);
        if (idx >= 0) {
            if (goods[idx].qty > 1) {
                goods[idx].qty--;
            } else {
                goods[idx].saleStatus = 'sold';
            }
            PodoDB.set('goods', goods);
        }
    }
    
    // 점주 적립금 추가
    if (item.ownerId) {
        const owners = PodoDB.get('owners') || [];
        const ownerIdx = owners.findIndex(o => o.id === item.ownerId);
        if (ownerIdx >= 0) {
            owners[ownerIdx].balance = (owners[ownerIdx].balance || 0) + settlement.ownerAmount;
            PodoDB.set('owners', owners);
        }
    }
    
    // 알림
    if (item.ownerId) {
        PodoNotification.add('sale', 
            `${item.title || item.name} 판매! (₩${item.price.toLocaleString()} → 내 수익 ₩${settlement.ownerAmount.toLocaleString()})`,
            'owner', item.ownerId);
    }
    
    return sale;
}

// ===================== 반품/취소 처리 =====================
function processRefund(saleId) {
    const sales = PodoDB.get('sales') || [];
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx < 0) return null;
    
    const sale = sales[idx];
    if (sale.saleStatus === 'refunded') return null;
    
    // 판매 상태 변경
    sales[idx].saleStatus = 'refunded';
    sales[idx].refundedAt = new Date().toISOString();
    PodoDB.set('sales', sales);
    
    // 재고 복구
    if (sale.itemType === 'book') {
        const books = PodoDB.get('books') || [];
        const bookIdx = books.findIndex(b => b.id === sale.itemId);
        if (bookIdx >= 0) {
            books[bookIdx].qty = (books[bookIdx].qty || 0) + 1;
            books[bookIdx].saleStatus = 'available';
            PodoDB.set('books', books);
        }
    } else {
        const goods = PodoDB.get('goods') || [];
        const goodsIdx = goods.findIndex(g => g.id === sale.itemId);
        if (goodsIdx >= 0) {
            goods[goodsIdx].qty = (goods[goodsIdx].qty || 0) + 1;
            goods[goodsIdx].saleStatus = 'available';
            PodoDB.set('goods', goods);
        }
    }
    
    // 점주 적립금 차감
    if (sale.ownerId) {
        const owners = PodoDB.get('owners') || [];
        const ownerIdx = owners.findIndex(o => o.id === sale.ownerId);
        if (ownerIdx >= 0) {
            owners[ownerIdx].balance = Math.max(0, (owners[ownerIdx].balance || 0) - sale.ownerAmount);
            PodoDB.set('owners', owners);
        }
    }
    
    // 알림
    PodoNotification.add('refund', 
        `${sale.itemTitle} 반품 처리됨 (₩${sale.price.toLocaleString()})`,
        'owner', sale.ownerId);
    
    return sales[idx];
}

// ===================== ISBN API (알라딘) =====================
// 실제로는 서버 프록시 필요 (CORS), 여기서는 시뮬레이션
async function fetchBookByISBN(isbn) {
    // 실제 구현 시: 서버를 통해 알라딘 API 호출
    // const response = await fetch(`/api/isbn/${isbn}`);
    // return await response.json();
    
    // 시뮬레이션 - 샘플 데이터
    const sampleBooks = {
        '9788937473135': { title: '아몬드', author: '손원평', publisher: '창비', pubYear: '2017', price: 12000, cover: '' },
        '9788937460784': { title: '데미안', author: '헤르만 헤세', publisher: '민음사', pubYear: '2009', price: 12000, cover: '' },
        '9791190030915': { title: '달러구트 꿈 백화점', author: '이미예', publisher: '팩토리나인', pubYear: '2020', price: 14000, cover: '' },
        '9788932917245': { title: '어린 왕자', author: '생텍쥐페리', publisher: '문학동네', pubYear: '2015', price: 12000, cover: '' },
        '9791168340442': { title: '불편한 편의점', author: '김호연', publisher: '나무옆의자', pubYear: '2021', price: 14000, cover: '' },
        '9788936434120': { title: '채식주의자', author: '한강', publisher: '창비', pubYear: '2007', price: 12000, cover: '' },
        '9788954699174': { title: '흰', author: '한강', publisher: '문학동네', pubYear: '2018', price: 13000, cover: '' }
    };
    
    // ISBN 정리 (하이픈 제거)
    const cleanIsbn = isbn.replace(/-/g, '');
    
    if (sampleBooks[cleanIsbn]) {
        return { success: true, data: sampleBooks[cleanIsbn] };
    }
    
    // 없으면 null (수동 입력 필요)
    return { success: false, message: 'ISBN을 찾을 수 없습니다. 수동으로 입력해주세요.' };
}

// ===================== QR코드 생성 =====================
function generateQRData(item) {
    // QR코드에 포함될 데이터
    return JSON.stringify({
        id: item.id,
        type: item.type,
        ownerNumber: item.ownerNumber,
        shelf: item.shelf,
        price: item.price
    });
}

// QR코드 라벨 HTML 생성
function generateQRLabel(item) {
    const qrData = encodeURIComponent(generateQRData(item));
    // QR코드 이미지 URL (Google Chart API 사용)
    const qrImageUrl = `https://chart.googleapis.com/chart?chs=100x100&cht=qr&chl=${qrData}&choe=UTF-8`;
    
    return `
        <div style="width:50mm;padding:3mm;border:1px solid #000;font-family:sans-serif;text-align:center;">
            <div style="font-size:12px;font-weight:bold;margin-bottom:2mm;">${item.title || item.name}</div>
            <div style="font-size:10px;color:#666;margin-bottom:3mm;">${item.ownerNumber || '포도책방'}</div>
            <img src="${qrImageUrl}" style="width:20mm;height:20mm;margin-bottom:2mm;">
            <div style="font-size:16px;font-weight:bold;">₩${item.price.toLocaleString()}</div>
        </div>
    `;
}

// 라벨 출력 (새 창에서 프린트)
function printQRLabel(item) {
    const labelHtml = generateQRLabel(item);
    const printWindow = window.open('', '_blank', 'width=300,height=400');
    printWindow.document.write(`
        <html>
        <head><title>QR 라벨 출력</title></head>
        <body style="margin:0;padding:10px;">
            ${labelHtml}
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===================== 통계 계산 =====================
function calcStats(branchId = null) {
    const branches = PodoDB.get('branches') || [];
    const owners = PodoDB.get('owners') || [];
    const books = PodoDB.get('books') || [];
    const goods = PodoDB.get('goods') || [];
    const sales = PodoDB.get('sales') || [];
    const shelves = PodoDB.get('shelves') || [];
    
    const filterByBranch = (arr) => branchId ? arr.filter(x => x.branchId === branchId) : arr;
    
    const filteredOwners = filterByBranch(owners);
    const filteredBooks = filterByBranch(books);
    const filteredGoods = filterByBranch(goods);
    const filteredSales = filterByBranch(sales).filter(s => s.saleStatus === 'completed');
    const filteredShelves = filterByBranch(shelves);
    
    const today = new Date().toISOString().split('T')[0];
    const todaySales = filteredSales.filter(s => s.createdAt.startsWith(today));
    
    const totalSalesAmount = filteredSales.reduce((sum, s) => sum + s.price, 0);
    const totalShopAmount = filteredSales.reduce((sum, s) => sum + s.shopAmount, 0);
    const totalOwnerAmount = filteredSales.reduce((sum, s) => sum + s.ownerAmount, 0);
    
    return {
        branchCount: branches.filter(b => b.status === 'active').length,
        ownerCount: filteredOwners.filter(o => o.status === 'active').length,
        bookCount: filteredBooks.filter(b => b.saleStatus === 'available').length,
        goodsCount: filteredGoods.filter(g => g.saleStatus === 'available').length,
        totalItems: filteredBooks.length + filteredGoods.length,
        shelfCount: filteredShelves.length,
        usedShelfCount: filteredShelves.filter(s => s.ownerId).length,
        totalSales: totalSalesAmount,
        shopRevenue: totalShopAmount,
        ownerRevenue: totalOwnerAmount,
        salesCount: filteredSales.length,
        todaySales: todaySales.reduce((sum, s) => sum + s.price, 0),
        todayCount: todaySales.length
    };
}

function calcOwnerStats(ownerId) {
    const owners = PodoDB.get('owners') || [];
    const books = PodoDB.get('books') || [];
    const goods = PodoDB.get('goods') || [];
    const sales = PodoDB.get('sales') || [];
    const shelves = PodoDB.get('shelves') || [];
    
    const owner = owners.find(o => o.id === ownerId);
    if (!owner) return null;
    
    const ownerBooks = books.filter(b => b.ownerId === ownerId && b.saleStatus === 'available');
    const ownerGoods = goods.filter(g => g.ownerId === ownerId && g.saleStatus === 'available');
    const ownerSales = sales.filter(s => s.ownerId === ownerId && s.saleStatus === 'completed');
    const ownerShelves = shelves.filter(s => s.ownerId === ownerId);
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthSales = ownerSales.filter(s => s.createdAt >= monthStart);
    
    const rent = ownerShelves.reduce((sum, s) => sum + (s.price || 0), 0);
    const monthOwnerAmount = monthSales.reduce((sum, s) => sum + s.ownerAmount, 0);
    
    return {
        owner,
        bookCount: ownerBooks.length,
        goodsCount: ownerGoods.length,
        totalItems: ownerBooks.length + ownerGoods.length,
        shelves: owner.shelves || [],
        shelfCount: ownerShelves.length,
        rent,
        balance: owner.balance || 0,
        totalSales: ownerSales.reduce((sum, s) => sum + s.price, 0),
        totalOwnerAmount: ownerSales.reduce((sum, s) => sum + s.ownerAmount, 0),
        monthSales: monthSales.reduce((sum, s) => sum + s.price, 0),
        monthOwnerAmount,
        monthCount: monthSales.length,
        expectedSettlement: monthOwnerAmount - rent
    };
}

// ===================== 유틸리티 =====================
function formatMoney(num) { return '₩' + Number(num || 0).toLocaleString(); }
function formatDate(str) { return str ? str.split('T')[0] : '-'; }
function formatDateTime(str) { return str ? str.replace('T', ' ').slice(0, 16) : '-'; }
function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function getTimeStr() { return new Date().toTimeString().slice(0, 5); }

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `padding:0.85rem 1.25rem;background:white;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.15);display:flex;align-items:center;gap:0.6rem;border-left:4px solid ${type === 'error' ? '#ef4444' : '#10b981'};transition:all 0.3s`;
    toast.innerHTML = `<span>${type === 'error' ? '❌' : '✓'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===================== 엑셀 내보내기 =====================
function exportToCSV(data, filename, headers) {
    let csv = '\uFEFF' + headers.join(',') + '\n';
    data.forEach(row => {
        csv += headers.map(h => {
            let val = row[h] ?? '';
            if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename + '_' + getTodayStr() + '.csv';
    link.click();
}

function exportSales(branchId = null, ownerId = null) {
    let data = (PodoDB.get('sales') || []).filter(s => s.saleStatus === 'completed');
    if (branchId) data = data.filter(s => s.branchId === branchId);
    if (ownerId) data = data.filter(s => s.ownerId === ownerId);
    
    const rows = data.map(s => ({
        '판매ID': s.id,
        '일시': s.createdAt,
        '상품명': s.itemTitle,
        '유형': s.itemType === 'book' ? '책' : '굿즈',
        '상태': s.status,
        '판매가': s.price,
        '책방수익': s.shopAmount,
        '점주수익': s.ownerAmount,
        '점주번호': s.ownerNumber,
        '결제': s.method === 'card' ? '카드' : s.method === 'cash' ? '현금' : '계좌'
    }));
    exportToCSV(rows, '판매내역', ['판매ID', '일시', '상품명', '유형', '상태', '판매가', '책방수익', '점주수익', '점주번호', '결제']);
}

function exportBooks(branchId = null, ownerId = null) {
    let data = PodoDB.get('books') || [];
    if (branchId) data = data.filter(b => b.branchId === branchId);
    if (ownerId) data = data.filter(b => b.ownerId === ownerId);
    
    const rows = data.map(b => ({
        'ISBN': b.isbn,
        '도서명': b.title,
        '저자': b.author,
        '출판사': b.publisher,
        '판매가': b.price,
        '수량': b.qty,
        '상태': BOOK_STATUS[b.status]?.name || b.status,
        '책장': b.shelf,
        '점주번호': b.ownerNumber,
        '판매상태': b.saleStatus === 'available' ? '판매중' : '판매됨'
    }));
    exportToCSV(rows, '도서목록', ['ISBN', '도서명', '저자', '출판사', '판매가', '수량', '상태', '책장', '점주번호', '판매상태']);
}

// ===================== 차트 데이터 =====================
function getSalesChartData(days = 7, branchId = null, ownerId = null) {
    let sales = (PodoDB.get('sales') || []).filter(s => s.saleStatus === 'completed');
    if (branchId) sales = sales.filter(s => s.branchId === branchId);
    if (ownerId) sales = sales.filter(s => s.ownerId === ownerId);
    
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = ['일','월','화','수','목','금','토'][date.getDay()];
        
        const daySales = sales.filter(s => s.createdAt.startsWith(dateStr));
        result.push({
            date: dateStr,
            label: `${date.getMonth()+1}/${date.getDate()}(${dayName})`,
            amount: daySales.reduce((sum, s) => sum + s.price, 0),
            count: daySales.length
        });
    }
    return result;
}

// ===================== 상품 검색 (다른 점주 책 포함) =====================
function searchItems(query, branchId = null, includeAllBranches = false) {
    const books = PodoDB.get('books') || [];
    const goods = PodoDB.get('goods') || [];
    const owners = PodoDB.get('owners') || [];
    const branches = PodoDB.get('branches') || [];
    
    const q = query.toLowerCase();
    
    let results = [];
    
    // 책 검색
    books.filter(b => b.saleStatus === 'available').forEach(b => {
        if (includeAllBranches || !branchId || b.branchId === branchId) {
            if (b.title?.toLowerCase().includes(q) || 
                b.author?.toLowerCase().includes(q) || 
                b.isbn?.includes(q) ||
                b.ownerNumber?.toLowerCase().includes(q)) {
                const owner = owners.find(o => o.id === b.ownerId);
                const branch = branches.find(br => br.id === b.branchId);
                results.push({
                    ...b,
                    ownerName: owner?.name || '',
                    branchName: branch?.name || ''
                });
            }
        }
    });
    
    // 굿즈 검색
    goods.filter(g => g.saleStatus === 'available').forEach(g => {
        if (includeAllBranches || !branchId || g.branchId === branchId) {
            if (g.name?.toLowerCase().includes(q) ||
                g.ownerNumber?.toLowerCase().includes(q)) {
                const owner = owners.find(o => o.id === g.ownerId);
                const branch = branches.find(br => br.id === g.branchId);
                results.push({
                    ...g,
                    title: g.name,
                    ownerName: owner?.name || '',
                    branchName: branch?.name || ''
                });
            }
        }
    });
    
    return results;
}

// ===================== 초기화 실행 =====================
initializeData();
