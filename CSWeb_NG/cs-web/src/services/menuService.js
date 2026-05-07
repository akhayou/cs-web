const addNameToNodes = (nodes) => {
    nodes.forEach((node) => {
        // Set the name property
        node.name = node.id;

        // If this node has children, recurse down to update them too
        if (node.children && node.children.length > 0) {
            addNameToNodes(node.children);
        }
    });
};

export async function buildMenuTree(muniments) {
    // 1. You must await the .json() parsing
    const response = await fetch('/menu.json');
    const menu = await response.json();

    // Deep clone to avoid mutating original references
    const menuCopy = JSON.parse(JSON.stringify(menu));

    const findNode = (nodes, id) => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    muniments.forEach((mun) => {
        const group = mun.MunData?.Options?.MnoGroup;
        const id = mun.MunGuid;
        const name = mun.MunName;

        let icon = 'ph ph-file-text';
        if (id.toLowerCase().includes('payment')) icon = 'oj-ux-ico-accounts-payable';
        else if (id.toLowerCase().includes('bill')) icon = 'oj-ux-ico-vendor-bill';

        let targetNodeId = 'general';
        if (group === 'Accounting') targetNodeId = 'accounting';
        else if (group === 'Stocks') targetNodeId = 'stock';

        const parentNode = findNode(menuCopy, targetNodeId);
        if (!parentNode) return;

        let targetChildren = parentNode.children || (parentNode.children = []);

        if (group === 'Accounting') {
            if (id.toLowerCase().includes('payment')) {
                const node = findNode(menuCopy, 'receipts');
                if (node) targetChildren = node.children || (node.children = []);
            } else if (id.toLowerCase().includes('voucher')) {
                const node = findNode(menuCopy, 'vouchers');
                if (node) targetChildren = node.children || (node.children = []);
            }
        } else if (group === 'Stocks' && id.toLowerCase().includes('bill')) {
            const node = findNode(menuCopy, 'bills');
            if (node) targetChildren = node.children || (node.children = []);
        }

        targetChildren.push({
            id,
            name: name ? name : id,
            icons: icon,
        });
    });

    addNameToNodes(menuCopy);
    sessionStorage.setItem('menuTree', JSON.stringify(menuCopy));

    return menuCopy;
}
