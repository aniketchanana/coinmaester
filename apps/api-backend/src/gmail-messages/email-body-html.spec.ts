import { toRenderableHtml } from './email-body-html';

describe('toRenderableHtml', () => {
  it('turns indented plaintext bank alerts into a compact key-value card', () => {
    const stored = `
                            Transaction Amount: 
                            INR 30
                            Merchant Name: 
                            MAA BALA SU
                            Date & Time: 
                            10-09-2026, 18:28:00 IST
    `;

    const html = toRenderableHtml(stored);

    expect(html).toContain('class="email-card"');
    expect(html).toContain('<dt>Transaction Amount</dt>');
    expect(html).toContain('<dd>INR 30</dd>');
    expect(html).toContain('<dt>Merchant Name</dt>');
    expect(html).toContain('<dd>MAA BALA SU</dd>');
    expect(html).not.toContain('<pre>');
  });

  it('leaves real HTML documents intact aside from viewer chrome', () => {
    const stored = `<!doctype html><html><head><title>Alert</title></head><body><table><tr><td>INR 30</td></tr></table></body></html>`;

    const html = toRenderableHtml(stored);

    expect(html).toContain('<table><tr><td>INR 30</td></tr></table>');
    expect(html).toContain('Content-Security-Policy');
  });
});
