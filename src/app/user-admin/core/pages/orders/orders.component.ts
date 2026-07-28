import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { OrdersService } from './orders.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit, AfterViewInit {
  orderList: any[] = [];
  isLoading: boolean = false;

  showPopup: boolean = false;
  showPopupStatus: boolean = false;
  productList: any[] = [];
  selectedItem: any;
  selectedStatus: string = ''; // ३. छानिएको स्टेटस राख्न यसलाई प्रयोग गर्ने

  constructor(
    public service: OrdersService,
    private toastr: ToastrService,
    private el: ElementRef,
  ) {}

  ngOnInit(): void {
    this.fetchMyOrders();
  }
  ngAfterViewInit(): void {}

  // ----------------------------------------------------
  // Product List को Total Amount (7700 + 990) Sum गर्ने फङ्क्सन
  // ----------------------------------------------------
  calculateGrandTotal(): number {
    if (!this.productList || this.productList.length === 0) {
      return 0;
    }

    return this.productList.reduce((sum, item) => {
      // 1. totalAmount वा total_amount छ कि छैन हेर्ने, नभए (price * qty) प्रयोग गर्ने
      const rawAmount =
        item.totalAmount ?? item.total_amount ?? item.price * item.qty;

      // 2. String/Comma आएमा हटाएर Number मा परिणत गर्ने
      const numericAmount =
        typeof rawAmount === 'string'
          ? parseFloat(rawAmount.replace(/,/g, ''))
          : Number(rawAmount);

      // 3. यदि NaN आएमा 0 लिने, नभए numericAmount जोड्ने
      return sum + (isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);
  }

  viewOrderDetails(ID: number) {
    this.isLoading = true;
    this.service.getProductListById(ID).subscribe({
      next: (res: any) => {
        this.productList = res;
        console.log(res, 'productList');
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      },
    });
  }

  openPopup(ID: number) {
    this.showPopup = true;
    this.viewOrderDetails(ID);
  }

  closePopup() {
    this.showPopup = false;
  }

  // Fetch Product List
  fetchMyOrders() {
    this.isLoading = true;
    this.service.getMyorders().subscribe({
      next: (res: any) => {
        this.orderList = res;
        console.log(res, 'orderList');
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      },
    });
  }
}
